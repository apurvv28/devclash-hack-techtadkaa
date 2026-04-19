export type AuditStatus =
  | 'queued'
  | 'fetching_github'
  | 'analyzing_code'
  | 'auditing_live'
  | 'testing_ui_ux'
  | 'synthesizing_ai'
  | 'fetching_market'
  | 'complete'
  | 'failed'

export type ComplexityTier = 1 | 2 | 3 | 4 | 5

export type CareerTier =
  | 'Beginner'
  | 'Junior'
  | 'Junior+'
  | 'Mid'
  | 'Mid+'
  | 'Senior'
  | 'Staff'

export type CommitArchetype =
  | 'Sprinter'
  | 'Craftsman'
  | 'Copy-Paster'
  | 'Documenter'
  | 'Ghost'

export interface AuditSession {
  id: string
  github_username: string
  project_urls: string[]
  deployment_url?: string
  resume_text?: string
  target_branch?: string
  target_module_path?: string
  status: AuditStatus
  progress_percent: number
  ui_ux_score?: number
  ui_ux_skipped?: boolean
  created_at: string
  completed_at?: string
}

export interface AuthorshipMap {
  id: string
  session_id: string
  repo_name: string
  branch_name: string
  file_path: string
  owned_line_ranges: LineRange[]
  contributed_line_ranges: LineRange[]
  ownership_percent: number
  is_tutorial_clone: boolean
  tutorial_clone_confidence: number
}

export interface LineRange {
  start: number
  end: number
}

export interface RepoAnalysis {
  id: string
  session_id: string
  repo_name: string
  branch_name: string
  analysis_scope: 'module' | 'breadth'
  language: string
  complexity_tier: ComplexityTier
  complexity_weight: number
  absolute_score: number
  weighted_score: number
  api_design_score: number
  service_layer_score: number
  data_access_score: number
  error_handling_score: number
  input_validation_score: number
  testing_score: number
  modularity_score: number
  doc_score: number
  security_issues: SecurityIssue[]
  plagiarism_flags: PlagiarismFlag[]
  architectural_pattern: string
  commit_archetype: CommitArchetype
}

export interface SecurityIssue {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  file: string
  line: number
  description: string
  fix: string
}

export interface PlagiarismFlag {
  file: string
  similarity_score: number
  source_hint: string
}

export interface SkillProfile {
  id: string
  session_id: string
  frontend_tier: CareerTier
  backend_tier: CareerTier
  devops_tier: CareerTier
  security_tier: CareerTier
  testing_tier: CareerTier
  db_design_tier: CareerTier
  system_design_tier: CareerTier
  overall_tier: CareerTier
  percentile_estimate: number
  claimed_tier?: CareerTier
  delta_summary: DeltaSummary
  commit_archetype: CommitArchetype
  ceiling_applied: boolean
  tutorial_penalty_applied: boolean
}

export interface DeltaSummary {
  claimed: string
  verified: string
  gap_areas: string[]
  strengths: string[]
}

export interface MarketFit {
  id: string
  session_id: string
  matched_roles: JobMatch[]
  salary_gap_skills: SalaryGapSkill[]
  target_companies: Company[]
  qualify_now: JobMatch[]
  qualify_90d: JobMatch[]
  qualify_6mo: JobMatch[]
}

export interface JobMatch {
  title: string
  company: string
  location: string
  salary_range?: string
  url: string
  match_percent: number
  missing_skills: string[]
}

export interface SalaryGapSkill {
  skill: string
  jd_frequency_percent: number
  current_level: string
  target_level: string
  career_roi_rank: number
}

export interface Company {
  name: string
  location: string
  is_remote: boolean
  realistic_match: boolean
  reason: string
}

export interface Roadmap {
  id: string
  session_id: string
  week_breakdown: WeekPlan[]
  priority_skills: string[]
  complexity_gap_prescription: string
  archetype_prescription: string
  resume_lead_projects: string[]
  resume_bury_projects: string[]
  recommendations: ResumeRecommendation[]
}

export interface WeekPlan {
  week: number
  title: string
  tasks: RoadmapTask[]
  milestone: string
}

export interface RoadmapTask {
  title: string
  description: string
  resource_url: string
  resource_type: 'docs' | 'video' | 'project' | 'practice'
  estimated_hours: number
}

export interface ResumeRecommendation {
  title: string
  recommendation: string
  evidence_source: string
  priority: 'high' | 'medium' | 'low'
}

export interface AuditFlawFinding {
  file: string
  line_start: number
  line_end: number
  repo_name: string
  github_permalink: string
  what_it_is: string
  why_it_matters: string
  what_fixing_unlocks: string
  severity: 'critical' | 'high' | 'medium'
  career_impact: string
}
