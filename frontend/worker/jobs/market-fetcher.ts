import type { Job } from 'bullmq'
import axios from 'axios'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchRemotiveJobs, fetchJoobleJobs, type RawJob } from '@/lib/market/jobs'
import { matchJobsToProfile } from '@/lib/market/matcher'
import type { SkillProfile, RepoAnalysis } from '@/types/index'

interface MarketFetchPayload {
  session_id: string
  skill_profile: SkillProfile
}

export async function handleMarketFetch(job: Job): Promise<void> {
  const { session_id, skill_profile } = job.data as MarketFetchPayload

  await updateSessionStatus(session_id, 'fetching_market', 96)

  // Load repo_analyses from DB for proper skill extraction
  const { data: repoAnalyses } = await supabaseAdmin
    .from('repo_analyses')
    .select('*')
    .eq('session_id', session_id)

  const repos: RepoAnalysis[] = (repoAnalyses ?? []) as RepoAnalysis[]

  // Derive candidate skills for job search queries
  const candidateSkills = deriveCandidateSkills(skill_profile, repos)
  const tier = skill_profile.overall_tier
  const country = 'in' // India default; gb for remote

  // ── Retrieve User Location from GitHub ──
  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('github_username')
    .eq('id', session_id)
    .single()

  let userLocationArr: string[] = []
  if (session?.github_username) {
    try {
      const headers: any = {}
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
      }
      
      // Get location from github public profile
      const ghRes = await axios.get(`https://api.github.com/users/${session.github_username}`, { 
        headers,
        timeout: 5000 
      })
      const ghLoc = ghRes.data?.location // e.g., "Pune, Maharashtra" or "Bangalore, India"
      
      if (ghLoc && typeof ghLoc === 'string') {
        const parts = ghLoc.split(',').map(s => s.trim())
        userLocationArr = [parts[0]] // strict local city first
        if (parts.length > 1) userLocationArr.push(ghLoc) // full string next
        
        console.log(`[MarketFetcher] Detected User Location from GitHub: ${ghLoc}`)
      }
    } catch(err: any) {
      console.warn(`[MarketFetcher] Failed to fetch GitHub profile for location:`, err.message)
    }
  }

  // Backup fallback if GitHub has no location
  if (userLocationArr.length === 0) {
    // We add regional tech hubs as fallback instead of just 'India' to avoid just getting 'India' as location text
    userLocationArr = ['Pune', 'Mumbai', 'Bangalore', 'Hyderabad', 'India']
  }

  console.log(`[MarketFetcher] Fetching jobs for tier=${tier}, location priority=[${userLocationArr.join(' → ')}]`)
  await updateSessionStatus(session_id, 'fetching_market', 97)

  // ── Fetch from Remotive (free, always try) + Jooble (if key present) ──
  let rawJobs: RawJob[] = []

  const [remotiveJobs, joobleJobs] = await Promise.allSettled([
    fetchRemotiveJobs(tier, candidateSkills),
    fetchJoobleJobs({ keywords: candidateSkills, max_results: 50, locations: userLocationArr }),
  ])

  if (remotiveJobs.status === 'fulfilled') {
    rawJobs.push(...remotiveJobs.value)
    console.log(`[MarketFetcher] Remotive: ${remotiveJobs.value.length} jobs`)
  } else {
    console.warn('[MarketFetcher] Remotive failed:', remotiveJobs.reason?.message)
  }

  if (joobleJobs.status === 'fulfilled') {
    rawJobs.push(...joobleJobs.value)
    console.log(`[MarketFetcher] Jooble: ${joobleJobs.value.length} jobs`)
  } else {
    console.warn('[MarketFetcher] Jooble failed (may not have API key):', joobleJobs.reason?.message)
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>()
  rawJobs = rawJobs.filter(j => {
    if (!j.url || seenUrls.has(j.url)) return false
    seenUrls.add(j.url)
    return true
  })

  console.log(`[MarketFetcher] Total unique jobs to match: ${rawJobs.length}`)
  await updateSessionStatus(session_id, 'fetching_market', 98)

  // ── Match jobs to profile ──
  const marketFit = await matchJobsToProfile({
    jobs: rawJobs,
    skill_profile,
    repo_analyses: repos,
    session_id,
  })

  // ── Update the audit report with market fit ──
  const { data: existingReport } = await supabaseAdmin
    .from('audit_reports')
    .select('id')
    .eq('session_id', session_id)
    .single()

  if (existingReport) {
    const { error: updateErr } = await supabaseAdmin
      .from('audit_reports')
      .update({ market_fit: marketFit })
      .eq('session_id', session_id)
    if (updateErr) console.warn('[MarketFetcher] Failed to attach market_fit to audit_report:', updateErr.message)
  }

  await updateSessionStatus(session_id, 'fetching_market', 99)
  await new Promise(r => setTimeout(r, 300))

  // ── Mark audit as complete ──
  const { error: completeErr } = await supabaseAdmin
    .from('audit_sessions')
    .update({
      status: 'complete',
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    })
    .eq('id', session_id)

  if (completeErr) {
    console.error(`[MarketFetcher] CRITICAL: Failed to mark audit complete:`, completeErr.message)
  } else {
    console.log(`[MarketFetcher] ✅ Audit ${session_id} completed! Jobs matched: ${marketFit.matched_roles.length} | Qualify now: ${marketFit.qualify_now.length}`)
  }
}

function deriveCandidateSkills(profile: SkillProfile, repos: RepoAnalysis[]): string[] {
  const skills = new Set<string>()

  // From repo languages
  for (const repo of repos) {
    if (repo.language && repo.language !== 'unknown') {
      skills.add(repo.language)
    }
  }

  // From tier
  const tier = profile.overall_tier
  if (['Senior', 'Staff', 'Mid+', 'Mid'].includes(tier)) {
    skills.add('typescript')
    skills.add('react')
    skills.add('node.js')
    skills.add('postgresql')
  }
  if (['Senior', 'Staff'].includes(tier)) {
    skills.add('system design')
    skills.add('kubernetes')
    skills.add('microservices')
  }
  if (['Junior', 'Junior+'].includes(tier)) {
    skills.add('javascript')
    skills.add('git')
    skills.add('sql')
  }
  if (profile.backend_tier === 'Senior' || profile.backend_tier === 'Staff') {
    skills.add('go')
  }

  return [...skills].slice(0, 8)
}

async function updateSessionStatus(sessionId: string, status: string, progress: number) {
  const { error } = await supabaseAdmin
    .from('audit_sessions')
    .update({ status, progress_percent: progress })
    .eq('id', sessionId)

  if (error) {
    console.error(`[MarketFetcher] DB UPDATE FAILED for session ${sessionId}:`, error.message)
  } else {
    console.log(`[MarketFetcher] Progress → ${progress}% (${status})`)
  }
}
