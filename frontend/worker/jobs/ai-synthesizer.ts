import type { Job } from 'bullmq'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getQueue, QUEUE_NAMES } from '@/lib/queue/client'
import { deriveSkillProfile } from '@/lib/utils/skill-engine'
import { generateRoadmap, generateFlawNarration, generateResumeRewrite } from '@/lib/ai/groq'
import { geminiFlawNarration, geminiResumeRewrite } from '@/lib/ai/gemini'
import type { RepoAnalysis, SkillProfile } from '@/types/index'
import type { QualityReport } from '@/types/analysis'
import type { AuditFlawFinding } from '@/types/index'

interface AISynthesisPayload {
  session_id: string
  repo_analyses: RepoAnalysis[]
  lighthouse_results: Array<{
    url: string
    performance: number
    accessibility: number
    best_practices: number
    seo: number
  }>
}

export async function handleAISynthesis(job: Job): Promise<void> {
  const { session_id, repo_analyses } = job.data as AISynthesisPayload

  console.log(`[AISynthesizer] Starting AI synthesis for session ${session_id}`)
  await updateSessionStatus(session_id, 'synthesizing_ai', 82)

  // Get session for claimed tier and resume
  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('resume_text, github_username')
    .eq('id', session_id)
    .single()

  await job.updateProgress(88)

  // Derive skill profile from analysis data
  const skillProfile = deriveSkillProfile({
    session_id,
    repo_analyses,
    quality_reports: [] as QualityReport[],
    has_tutorial_repos: repo_analyses.some((r) => r.plagiarism_flags.length > 0),
    tutorial_repo_count: repo_analyses.filter((r) => r.plagiarism_flags.length > 0).length,
    total_repo_count: repo_analyses.length,
  })

  console.log(`[AISynthesizer] Skill Profile derived — overall tier: ${skillProfile.overall_tier}`)
  await updateSessionStatus(session_id, 'synthesizing_ai', 84)

  // Store skill profile (use proper UUID)
  const profileToSave = { ...skillProfile, id: crypto.randomUUID() }
  const { error: spError } = await supabaseAdmin.from('skill_profiles').upsert(profileToSave)
  if (spError) console.warn('[AISynthesizer] Failed to save skill_profile (non-fatal):', spError.message)

  await updateSessionStatus(session_id, 'synthesizing_ai', 86)
  await job.updateProgress(86)

  // ── Generate AI flaw findings (Groq primary, Gemini fallback) ──
  const flawFindings: AuditFlawFinding[] = []
  const criticalRepos = repo_analyses
    .filter((r) => r.security_issues.some((i) => i.severity === 'critical' || i.severity === 'high'))
    .slice(0, 3)

  console.log(`[AISynthesizer] Generating flaw narration for ${criticalRepos.length} repos via Groq (Llama 4 Scout)...`)
  await updateSessionStatus(session_id, 'synthesizing_ai', 88)

  for (const repo of criticalRepos) {
    const criticalIssues = repo.security_issues.filter(
      (i) => i.severity === 'critical' || i.severity === 'high'
    )

    for (const issue of criticalIssues.slice(0, 3)) {
      const narrationParams = {
        code_chunk: '// ' + issue.description,
        filename: issue.file,
        line_start: issue.line,
        line_end: issue.line,
        repo_name: repo.repo_name,
        branch_name: repo.branch_name,
        github_username: session?.github_username || 'developer',
        complexity_tier: repo.complexity_tier,
        career_tier: skillProfile.overall_tier,
        security_issues: [issue],
        dimension_scores: { absolute_score: repo.absolute_score },
      }

      try {
        // Primary: Groq
        const items = await generateFlawNarration(narrationParams)
        if (items.length > 0) {
          flawFindings.push(...items)
        } else {
          // Fallback: Gemini
          console.log(`[AISynthesizer] Groq returned empty, trying Gemini fallback...`)
          const geminiItems = await geminiFlawNarration(narrationParams)
          flawFindings.push(...geminiItems)
        }
      } catch {
        // Skip silently
      }
    }
  }

  await updateSessionStatus(session_id, 'synthesizing_ai', 90)
  await job.updateProgress(90)

  // ── Generate roadmap via Groq ──
  console.log(`[AISynthesizer] Generating 90-day learning roadmap via Groq...`)
  await updateSessionStatus(session_id, 'synthesizing_ai', 91)
  const roadmap = await generateRoadmap({
    session_id,
    github_username: session?.github_username || 'developer',
    overall_tier: skillProfile.overall_tier,
    skill_gaps: skillProfile.delta_summary.gap_areas.map(g => ({ dimension: g, score: 40, tier: 'Junior' })),
    strengths: skillProfile.delta_summary.strengths.map(s => ({ dimension: s, score: 85, tier: 'Senior' })),
    highest_complexity_tier: repo_analyses[0]?.complexity_tier ?? 1,
    commit_archetype: skillProfile.commit_archetype,
    salary_gap_skills: [],
    resume_bury_repos: [],
    security_issues_count: flawFindings.length,
    tutorial_penalty_applied: skillProfile.tutorial_penalty_applied,
  })

  // ── Rewrite resume bullets if provided (Groq primary, Gemini fallback) ──
  if (session?.resume_text) {
    const bullets = session.resume_text
      .split('\n')
      .filter((l: string) => l.trim().startsWith('•') || l.trim().startsWith('-'))
      .map((l: string) => l.replace(/^[•\-]\s*/, '').trim())
      .filter((l: string) => l.length > 20)
      .slice(0, 10)

    if (bullets.length > 0) {
      const evidence = repo_analyses.map(r => ({
        repo_name: r.repo_name,
        complexity_tier: r.complexity_tier,
        weighted_score: r.weighted_score,
        top_skills: [],
        security_issues_count: r.security_issues.length,
        has_tests: r.testing_score > 50,
        languages: [r.language],
      }))

      let rewrittenBullets = await generateResumeRewrite({
        original_bullets: bullets,
        audit_evidence: evidence,
        is_tutorial_repos: [],
        overall_tier: skillProfile.overall_tier,
        github_username: session?.github_username || 'developer',
      })

      if (rewrittenBullets.length === 0) {
        console.log('[AISynthesizer] Groq resume rewrite empty, trying Gemini fallback...')
        rewrittenBullets = await geminiResumeRewrite({
          original_bullets: bullets,
          audit_evidence: evidence,
          overall_tier: skillProfile.overall_tier,
          github_username: session?.github_username || 'developer',
        })
      }

      roadmap.rewritten_bullets = rewrittenBullets
    }
  }

  console.log(`[AISynthesizer] AI synthesis complete. ${flawFindings.length} flaw findings generated.`)
  await updateSessionStatus(session_id, 'synthesizing_ai', 93)

  // Store everything in audit_reports (non-fatal if table doesn't exist)
  const { error: reportErr } = await supabaseAdmin.from('audit_reports').upsert({
    id: crypto.randomUUID(),
    session_id,
    repo_analyses,
    skill_profile: skillProfile,
    roadmap,
    flaw_findings: flawFindings,
    generated_at: new Date().toISOString(),
  })
  if (reportErr) {
    console.warn('[AISynthesizer] Failed to save audit_report (non-fatal):', reportErr.message)
  }

  await updateSessionStatus(session_id, 'synthesizing_ai', 94)
  await new Promise(r => setTimeout(r, 300))
  await updateSessionStatus(session_id, 'fetching_market', 95)

  // Enqueue market fetch
  const marketQueue = getQueue(QUEUE_NAMES.MARKET_FETCH)
  await marketQueue.add('fetch-market', { session_id, skill_profile: skillProfile })
}

async function updateSessionStatus(sessionId: string, status: string, progress: number) {
  const { error } = await supabaseAdmin
    .from('audit_sessions')
    .update({ status, progress_percent: progress })
    .eq('id', sessionId)

  if (error) {
    console.error(`[AISynthesizer] DB UPDATE FAILED for session ${sessionId}:`, error.message)
  } else {
    console.log(`[AISynthesizer] Progress → ${progress}% (${status})`)
  }
}
