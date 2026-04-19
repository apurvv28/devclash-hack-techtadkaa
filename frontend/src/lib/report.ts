import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AuditReport } from '@/types/audit'
import type {
  AuditSession,
  RepoAnalysis,
  SkillProfile,
  MarketFit,
  Roadmap,
  AuditFlawFinding,
} from '@/types/index'

/**
 * Fetch the full audit report by session ID.
 * Queries all related tables and assembles the AuditReport shape.
 * Returns null if the session doesn't exist or isn't complete.
 */
export async function getFullReport(sessionId: string): Promise<AuditReport | null> {
  // 1. Fetch session
  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session || session.status !== 'complete') {
    return null
  }

  // 2. Fetch all related data in parallel
  const [repoRes, skillRes, marketRes, roadmapRes, liveAppRes] = await Promise.all([
    supabaseAdmin
      .from('repo_analyses')
      .select('*')
      .eq('session_id', sessionId),
    supabaseAdmin
      .from('skill_profiles')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('market_fit')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('roadmaps')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('live_app_audits')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const report: AuditReport = {
    session: session as AuditSession,
    repo_analyses: (repoRes.data ?? []) as RepoAnalysis[],
    skill_profile: (skillRes.data?.[0] ?? {}) as SkillProfile,
    market_fit: (marketRes.data?.[0] ?? {}) as MarketFit,
    roadmap: (roadmapRes.data?.[0] ?? null) as Roadmap,
    flaw_findings: ((skillRes.data?.[0] as any)?.flaw_findings ?? []) as AuditFlawFinding[],
    live_app_audit: liveAppRes.data?.[0] ?? null,
    generated_at: session.completed_at ?? new Date().toISOString(),
    share_token: undefined, // no longer extracted from audit_reports
  }

  return report
}
