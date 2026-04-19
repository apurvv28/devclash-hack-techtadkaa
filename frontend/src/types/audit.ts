import type { AuditStatus, AuditSession, RepoAnalysis, SkillProfile, MarketFit, Roadmap, AuditFlawFinding } from './index'

export interface AuditStartPayload {
  github_username: string
  project_urls: string[]
  deployment_url?: string
  resume_text?: string
  target_branch?: string
  target_module_path?: string
}

export interface AuditStatusResponse {
  session: AuditSession
  current_stage: string
  eta_seconds?: number
  error_message?: string
}

export interface AuditStreamEvent {
  type: 'progress' | 'stage_change' | 'finding' | 'complete' | 'error'
  stage?: AuditStatus
  progress_percent?: number
  message?: string
  finding?: AuditFlawFinding
  error?: string
}

export interface AuditReport {
  session: AuditSession
  repo_analyses: RepoAnalysis[]
  skill_profile: SkillProfile
  market_fit: MarketFit
  roadmap: Roadmap
  flaw_findings: AuditFlawFinding[]
  live_app_audit?: any
  generated_at: string
  share_token?: string
}

export interface AuditResumePayload {
  session_id: string
  from_stage: AuditStatus
}

export interface AuditShareResponse {
  share_url: string
  expires_at: string
  token: string
}

export interface AuditListItem {
  id: string
  github_username: string
  status: AuditStatus
  progress_percent: number
  created_at: string
  completed_at?: string
  project_count: number
}
