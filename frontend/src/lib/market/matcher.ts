import type { JobMatch, SkillProfile, SalaryGapSkill, Company, MarketFit, RepoAnalysis } from '@/types/index'
import { extractSkillsFromJD, type RawJob } from './jobs'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ─── Skill ROI ranking (higher = more career value) ──────────────────────────

const SKILL_ROI: Record<string, number> = {
  'kubernetes': 1, 'rust': 2, 'go': 3, 'system design': 4,
  'distributed systems': 5, 'typescript': 6, 'graphql': 7,
  'postgresql': 8, 'redis': 9, 'aws': 10, 'docker': 11,
  'machine learning': 12, 'react': 13, 'nextjs': 14, 'node': 15,
}

// ─── Extract confirmed skills from repo analyses ──────────────────────────────

function extractConfirmedSkills(repo_analyses: RepoAnalysis[]): string[] {
  const skills = new Set<string>()

  for (const repo of repo_analyses) {
    // Language is a confirmed skill
    if (repo.language && repo.language !== 'unknown') {
      skills.add(repo.language.toLowerCase())
      // Map common language names to job-listing format
      if (repo.language === 'typescript') skills.add('javascript')
      if (repo.language === 'javascript') skills.add('node')
    }

    // Architectural pattern signals framework knowledge
    const pattern = repo.architectural_pattern?.toLowerCase() ?? ''
    if (pattern.includes('react')) { skills.add('react'); skills.add('javascript') }
    if (pattern.includes('next')) { skills.add('nextjs'); skills.add('react') }
    if (pattern.includes('express')) { skills.add('node'); skills.add('express') }
    if (pattern.includes('django')) { skills.add('django'); skills.add('python') }
    if (pattern.includes('spring')) { skills.add('spring'); skills.add('java') }

    // High scores indicate demonstrable skill
    if (repo.api_design_score > 70) skills.add('rest')
    if (repo.data_access_score > 65) { skills.add('sql'); skills.add('postgresql') }
    if (repo.testing_score > 60) skills.add('tdd')
    if (repo.security_issues.length === 0) skills.add('security')
  }

  return Array.from(skills)
}

// ─── Core: matchJobsToProfile ────────────────────────────────────────────────

export async function matchJobsToProfile(params: {
  jobs: RawJob[]
  skill_profile: SkillProfile
  repo_analyses: RepoAnalysis[]
  session_id: string
}): Promise<MarketFit> {
  const { jobs, skill_profile, repo_analyses, session_id } = params

  const confirmedSkills = extractConfirmedSkills(repo_analyses)
  console.log(`[Market:Matcher] Confirmed skills from code: ${confirmedSkills.join(', ')}`)

  // ── Step 1: Match each job ──
  const matchedJobs: JobMatch[] = []

  for (const rawJob of jobs) {
    const jobText = [rawJob.title, ...(rawJob.tags ?? []), rawJob.description ?? ''].join(' ')
    const requiredSkills = extractSkillsFromJD(jobText)

    if (requiredSkills.length === 0) {
      // Fall back to tier-based matching
      const match = tierMatch(skill_profile.overall_tier, rawJob.title)
      if (match > 20) {
        matchedJobs.push({
          title: rawJob.title,
          company: rawJob.company,
          location: rawJob.location,
          salary_range: rawJob.salary,
          url: rawJob.url,
          match_percent: match,
          missing_skills: [],
        })
      }
      continue
    }

    const matched = requiredSkills.filter(s =>
      confirmedSkills.some(cs => cs.includes(s) || s.includes(cs))
    )
    const missing = requiredSkills.filter(s =>
      !confirmedSkills.some(cs => cs.includes(s) || s.includes(cs))
    )

    const matchPct = Math.round((matched.length / requiredSkills.length) * 100)

    if (matchPct > 20) {
      matchedJobs.push({
        title: rawJob.title,
        company: rawJob.company,
        location: rawJob.location,
        salary_range: rawJob.salary,
        url: rawJob.url,
        match_percent: Math.min(matchPct, 99), // Never show 100%
        missing_skills: missing.slice(0, 5),
      })
    }
  }

  // Sort by match_percent descending
  matchedJobs.sort((a, b) => b.match_percent - a.match_percent)

  // ── Step 2: Segmentation ──
  const qualify_now = matchedJobs.filter(j => j.match_percent >= 70)
  const qualify_90d = matchedJobs.filter(j => j.match_percent >= 50 && j.match_percent < 70)
  const qualify_6mo = matchedJobs.filter(j => j.match_percent >= 30 && j.match_percent < 50)

  // ── Step 3: Salary gap skills from 90d and 6mo targets ──
  const salary_gap_skills = computeSalaryGapSkills(
    confirmedSkills,
    [...qualify_90d, ...qualify_6mo]
  )

  // ── Step 4: Target companies from qualify_now ──
  const target_companies = suggestTargetCompanies(qualify_now, skill_profile)

  // ── Step 5: Percentile from skill profile ──
  const percentile = skill_profile.percentile_estimate

  console.log(`[Market:Matcher] Matched: ${matchedJobs.length} jobs | Now: ${qualify_now.length} | 90d: ${qualify_90d.length} | 6mo: ${qualify_6mo.length}`)

  const marketFit: MarketFit = {
    id: crypto.randomUUID(),
    session_id,
    matched_roles: matchedJobs.slice(0, 30),
    salary_gap_skills,
    target_companies,
    qualify_now: qualify_now.slice(0, 15),
    qualify_90d: qualify_90d.slice(0, 15),
    qualify_6mo: qualify_6mo.slice(0, 15),
  }

  // Save to market_fit table (non-fatal)
  const { error } = await supabaseAdmin.from('market_fit').upsert(marketFit)
  if (error) console.warn('[Market:Matcher] Failed to save market_fit (non-fatal):', error.message)

  return marketFit
}

// ─── Salary gap skills ────────────────────────────────────────────────────────

export function computeSalaryGapSkills(
  confirmedSkills: string[],
  gapJobs: JobMatch[],
  topN = 10
): SalaryGapSkill[] {
  const freq: Record<string, number> = {}
  const total = gapJobs.length || 1

  for (const job of gapJobs) {
    for (const skill of job.missing_skills) {
      freq[skill] = (freq[skill] ?? 0) + 1
    }
  }

  return Object.entries(freq)
    .filter(([skill]) => !confirmedSkills.includes(skill))
    .map(([skill, count], idx) => ({
      skill,
      jd_frequency_percent: Math.round((count / total) * 100),
      current_level: confirmedSkills.includes(skill) ? 'beginner' : 'none',
      target_level: (SKILL_ROI[skill] ?? 99) <= 6 ? 'Senior' : 'Mid',
      career_roi_rank: SKILL_ROI[skill] ?? 50 + idx,
    }))
    .sort((a, b) => a.career_roi_rank - b.career_roi_rank || b.jd_frequency_percent - a.jd_frequency_percent)
    .slice(0, topN)
}

// ─── Company targeting ────────────────────────────────────────────────────────

export function suggestTargetCompanies(
  qualifyNowJobs: JobMatch[],
  profile: SkillProfile
): Company[] {
  const companyMap = new Map<string, { job: JobMatch; count: number }>()

  for (const job of qualifyNowJobs) {
    if (!job.company || job.company === 'Unknown Company') continue
    const existing = companyMap.get(job.company)
    if (!existing) {
      companyMap.set(job.company, { job, count: 1 })
    } else {
      existing.count++
    }
  }

  return Array.from(companyMap.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([company, { job }]) => ({
      name: company,
      location: job.location,
      is_remote: /remote/i.test(job.location),
      realistic_match: job.match_percent >= 70,
      reason: `Your ${profile.overall_tier} profile matches their "${job.title}" role (${job.match_percent}% skill match)`,
    }))
}

// ─── Tier-based fallback matcher ──────────────────────────────────────────────

function tierMatch(tier: SkillProfile['overall_tier'], jobTitle: string): number {
  const tierScore: Record<string, number> = {
    Staff: 4, Senior: 3, 'Mid+': 2.5, Mid: 2, 'Junior+': 1.5, Junior: 1, Beginner: 0.5,
  }
  let roleScore = 2
  if (/senior|sr\.|staff|principal|lead|architect/i.test(jobTitle)) roleScore = 3
  else if (/junior|jr\.|associate|entry/i.test(jobTitle)) roleScore = 1

  const delta = Math.abs((tierScore[tier] ?? 2) - roleScore)
  return Math.max(0, Math.round(100 - delta * 30))
}

// ─── Legacy exports for backward compat ──────────────────────────────────────

export function segmentByReadiness(jobs: JobMatch[]) {
  return {
    qualify_now: jobs.filter(j => j.match_percent >= 70),
    qualify_90d: jobs.filter(j => j.match_percent >= 50 && j.match_percent < 70),
    qualify_6mo: jobs.filter(j => j.match_percent >= 30 && j.match_percent < 50),
  }
}

export function matchJobsToProfileLegacy(
  jobs: JobMatch[],
  profile: SkillProfile,
  candidateSkills: string[]
): JobMatch[] {
  return jobs.map(job => {
    const match = tierMatch(profile.overall_tier, job.title)
    return { ...job, match_percent: match }
  }).sort((a, b) => b.match_percent - a.match_percent)
}
