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

  // Aggregate dimension scores from quality reports
  const avgDimension = (name: string): number => {
    const scores = quality_reports
      .flatMap((r) => r.dimensions)
      .filter((d) => d.name === name)
      .map((d) => d.score)
    return scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
  }

  const frontendScore = avgDimension('api_design') * 0.4 + avgDimension('modularity') * 0.3 + avgDimension('documentation') * 0.3
  const backendScore = avgDimension('service_layer') * 0.35 + avgDimension('data_access') * 0.35 + avgDimension('error_handling') * 0.3
  const testingScore = avgDimension('testing')
  const securityScore = 100 - (repo_analyses.flatMap((r) => r.security_issues).filter((i) => i.severity === 'critical' || i.severity === 'high').length * 10)
  const dbDesignScore = avgDimension('data_access')
  const systemDesignScore = Math.max(...repo_analyses.map((r) => r.complexity_weight * 50), 0)

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
  if (backendScore > 70) strengths.push('Backend service architecture')
  if (frontendScore > 70) strengths.push('Frontend engineering')

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
