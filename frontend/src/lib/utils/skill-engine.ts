import type { SkillProfile, CareerTier, RepoAnalysis, CommitArchetype } from '@/types/index'
import type { QualityReport } from '@/types/analysis'

const TIER_RANK: Record<CareerTier, number> = {
  Beginner: 0,
  Junior: 1,
  'Junior+': 2,
  Mid: 3,
  'Mid+': 4,
  Senior: 5,
  Staff: 6,
}

const RANK_TIER = Object.fromEntries(
  Object.entries(TIER_RANK).map(([t, r]) => [r, t])
) as Record<number, CareerTier>

export interface SkillEngineInput {
  session_id: string
  repo_analyses: RepoAnalysis[]
  quality_reports: QualityReport[]
  claimed_tier?: CareerTier
  has_tutorial_repos: boolean
  tutorial_repo_count: number
  total_repo_count: number
}

/**
 * Derives the verified skill profile from code evidence.
 * Applies tutorial penalty and complexity ceiling.
 */
export function deriveSkillProfile(input: SkillEngineInput): SkillProfile {
  const {
    session_id,
    repo_analyses,
    quality_reports,
    claimed_tier,
    has_tutorial_repos,
    tutorial_repo_count,
    total_repo_count,
  } = input

  // Aggregate dimension scores from repo_analyses
  const avgDimension = (key: keyof RepoAnalysis): number => {
    const scores = repo_analyses
      .map((r) => r[key] as number)
      .filter((s) => typeof s === 'number')
    return scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 40
  }

  const frontendScore = avgDimension('api_design_score') * 0.4 + avgDimension('modularity_score') * 0.3 + avgDimension('doc_score') * 0.3
  const backendScore = avgDimension('service_layer_score') * 0.35 + avgDimension('data_access_score') * 0.35 + avgDimension('error_handling_score') * 0.3
  const testingScore = avgDimension('testing_score')
  
  const criticalIssues = repo_analyses.flatMap((r) => r.security_issues).filter((i) => i.severity === 'critical' || i.severity === 'high').length
  const mediumIssues = repo_analyses.flatMap((r) => r.security_issues).filter((i) => i.severity === 'medium').length
  const baseSecurity = 50 + Math.max(...repo_analyses.map((r) => r.complexity_tier), 1) * 5
  const securityScore = Math.max(0, baseSecurity - (criticalIssues * 15) - (mediumIssues * 5))

  // ── DB Design Score: derived from actual codebase evidence ──
  // Uses data_access_score as base, then adds/deducts based on architecture patterns
  const rawDataAccess = avgDimension('data_access_score')
  const maxComplexity = Math.max(...repo_analyses.map((r) => r.complexity_tier))
  
  // Check codebase for DB-related patterns across all repos
  let dbBonuses = 0
  let dbEvidence: string[] = []
  for (const repo of repo_analyses) {
    // ORM / database abstraction (already factored into data_access_score somewhat)
    if (repo.architectural_pattern) {
      const arch = repo.architectural_pattern.toLowerCase()
      if (arch.includes('prisma') || arch.includes('sequelize') || arch.includes('mongoose') || arch.includes('typeorm')) {
        dbBonuses += 10
        dbEvidence.push('ORM usage')
      }
    }
    // Higher complexity means more sophisticated data modeling
    if (repo.complexity_tier >= 3) {
      dbBonuses += 10
      dbEvidence.push('Complex project tier')
    }
    if (repo.complexity_tier >= 4) {
      dbBonuses += 15
      dbEvidence.push('Advanced project tier')
    }
    // Service layer existence implies proper data separation
    if (repo.service_layer_score > 50) {
      dbBonuses += 10
      dbEvidence.push('Service layer separation')
    }
  }
  // Cap DB bonuses and compute final score
  dbBonuses = Math.min(dbBonuses, 35)
  let dbDesignScore = Math.min(100, rawDataAccess + dbBonuses)
  
  // Apply complexity ceiling: if max complexity is <= 2, cap DB design
  if (maxComplexity <= 2) {
    dbDesignScore = Math.min(dbDesignScore, 50) // Can't be above Mid for trivial projects
  }
  if (maxComplexity <= 1) {
    dbDesignScore = Math.min(dbDesignScore, 35) // Can't be above Junior+ for hello-world
  }

  // ── System Design Score: derived from architectural complexity evidence ──
  // Uses modularity, complexity tier, and architectural pattern as inputs
  const rawModularity = avgDimension('modularity_score')
  const avgServiceLayer = avgDimension('service_layer_score')
  
  let systemDesignBase = (rawModularity * 0.25) + (avgServiceLayer * 0.25) + (avgDimension('error_handling_score') * 0.15) + (avgDimension('api_design_score') * 0.15) + (avgDimension('input_validation_score') * 0.1) + (avgDimension('testing_score') * 0.1)
  
  // Architecture-aware bonuses
  let sysDesignBonuses = 0
  for (const repo of repo_analyses) {
    // Complexity tier directly reflects architectural depth
    if (repo.complexity_tier >= 3) sysDesignBonuses += 10
    if (repo.complexity_tier >= 4) sysDesignBonuses += 15
    if (repo.complexity_tier >= 5) sysDesignBonuses += 15 // Advanced architecture
    
    // Multi-module architecture shows system thinking
    if (repo.analysis_scope === 'module') sysDesignBonuses += 5
    
    // High modularity + high service layer = good system design
    if (repo.modularity_score > 70 && repo.service_layer_score > 60) {
      sysDesignBonuses += 10
    }
  }
  
  sysDesignBonuses = Math.min(sysDesignBonuses, 40)
  let systemDesignScore = Math.min(100, systemDesignBase + sysDesignBonuses)
  
  // Apply complexity ceiling: system design can't be inflated for simple projects
  if (maxComplexity <= 2) {
    systemDesignScore = Math.min(systemDesignScore, 50)
  }
  if (maxComplexity <= 1) {
    systemDesignScore = Math.min(systemDesignScore, 35)
  }

  // Compute archetype from all repo analyses
  const archetypes = repo_analyses.map((r) => r.commit_archetype)
  const commit_archetype = mostCommon(archetypes) as CommitArchetype

  // Tutorial penalty: if >50% repos are tutorials, cap at Junior+
  const tutorialRatio = total_repo_count > 0 ? tutorial_repo_count / total_repo_count : 0
  const tutorial_penalty_applied = tutorialRatio > 0.5

  // Max complexity achieved caps the ceiling
  const maxTier = Math.max(...repo_analyses.map((r) => r.complexity_tier))
  const ceiling_applied = maxTier <= 2

  const overallScore =
    frontendScore * 0.2 +
    backendScore * 0.2 +
    securityScore * 0.15 +
    testingScore * 0.2 +
    dbDesignScore * 0.1 +
    systemDesignScore * 0.15

  let overall_tier = scoreToTier(overallScore)

  // Apply tutorial penalty
  if (tutorial_penalty_applied) {
    overall_tier = demoteTier(overall_tier, 1)
  }

  // Apply complexity ceiling
  if (ceiling_applied && TIER_RANK[overall_tier] > TIER_RANK['Mid']) {
    overall_tier = 'Mid'
  }

  const gapAreas: string[] = []
  const strengths: string[] = []

  if (testingScore < 40) gapAreas.push('Testing practices')
  if (securityScore < 60) gapAreas.push('Security awareness')
  if (dbDesignScore < 40) gapAreas.push('Database design')
  if (systemDesignScore < 40) gapAreas.push('System design')
  if (backendScore > 70) strengths.push('Backend service architecture')
  if (frontendScore > 70) strengths.push('Frontend engineering')
  if (systemDesignScore > 65) strengths.push('System design')
  if (dbDesignScore > 65) strengths.push('Database architecture')

  return {
    id: `sp-${session_id}`,
    session_id,
    frontend_tier: scoreToTier(frontendScore),
    backend_tier: scoreToTier(backendScore),
    devops_tier: 'Junior', // Requires separate CI/CD analysis
    security_tier: scoreToTier(Math.max(0, securityScore)),
    testing_tier: scoreToTier(testingScore),
    db_design_tier: scoreToTier(dbDesignScore),
    system_design_tier: scoreToTier(systemDesignScore),
    overall_tier,
    percentile_estimate: tierToPercentile(overall_tier),
    claimed_tier,
    delta_summary: {
      claimed: claimed_tier ?? 'Not stated',
      verified: overall_tier,
      gap_areas: gapAreas,
      strengths,
    },
    commit_archetype,
    ceiling_applied,
    tutorial_penalty_applied,
  }
}

function scoreToTier(score: number): CareerTier {
  if (score >= 90) return 'Staff'
  if (score >= 78) return 'Senior'
  if (score >= 65) return 'Mid+'
  if (score >= 52) return 'Mid'
  if (score >= 38) return 'Junior+'
  if (score >= 22) return 'Junior'
  return 'Beginner'
}

function demoteTier(tier: CareerTier, steps: number): CareerTier {
  const rank = Math.max(0, TIER_RANK[tier] - steps)
  return RANK_TIER[rank]
}

function mostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>()
  for (const item of arr) counts.set(item, (counts.get(item) ?? 0) + 1)
  return [...counts.entries()].sort(([, a], [, b]) => b - a)[0]?.[0] ?? arr[0]
}

function tierToPercentile(tier: CareerTier): number {
  const map: Record<CareerTier, number> = {
    Beginner: 10,
    Junior: 25,
    'Junior+': 38,
    Mid: 52,
    'Mid+': 65,
    Senior: 80,
    Staff: 93,
  }
  return map[tier]
}
