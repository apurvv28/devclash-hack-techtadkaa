import { supabaseAdmin } from './admin'
import type {
  AuditSession,
  AuditStatus,
  AuthorshipMap,
  RepoAnalysis,
  SkillProfile,
  MarketFit,
  Roadmap,
  AuditFlawFinding,
} from '@/types/index'

// ──────────────────────────────────────────────
// Error type
// ──────────────────────────────────────────────

export class SupabaseQueryError extends Error {
  public readonly table: string
  public readonly operation: string
  public readonly code?: string

  constructor(
    message: string,
    table: string,
    operation: string,
    code?: string
  ) {
    super(`[${table}.${operation}] ${message}`)
    this.name = 'SupabaseQueryError'
    this.table = table
    this.operation = operation
    this.code = code
  }
}

// ──────────────────────────────────────────────
// Full report aggregate type
// ──────────────────────────────────────────────

export interface FullReport {
  session: AuditSession
  authorshipMaps: AuthorshipMap[]
  repoAnalyses: RepoAnalysis[]
  skillProfile: SkillProfile | null
  marketFit: MarketFit | null
  roadmap: Roadmap | null
  flawFindings: AuditFlawFinding[]
  liveAppAudits: LiveAppAuditRow[]
}

export interface LiveAppAuditRow {
  id: string
  session_id: string
  url: string
  performance_score: number | null
  accessibility_score: number | null
  seo_score: number | null
  best_practices_score: number | null
  fcp_ms: number | null
  lcp_ms: number | null
  tti_ms: number | null
  cls_score: number | null
  viewport_results: unknown[]
  broken_links: string[]
  has_ssl: boolean
  raw_lighthouse: Record<string, unknown>
  created_at: string
}

// ──────────────────────────────────────────────
// Input types (what callers pass in)
// ──────────────────────────────────────────────

export interface CreateAuditSessionInput {
  github_username: string
  github_access_token?: string
  project_urls: string[]
  resume_text?: string
  target_branch?: string
  target_module_path?: string
}

export interface SaveAuthorshipMapInput {
  session_id: string
  repo_name: string
  branch_name: string
  file_path: string
  owned_line_ranges: Array<{ start: number; end: number }>
  contributed_line_ranges: Array<{ start: number; end: number }>
  ownership_percent: number
  is_tutorial_clone: boolean
  tutorial_clone_confidence: number
}

export interface SaveRepoAnalysisInput {
  session_id: string
  repo_name: string
  branch_name: string
  analysis_scope: 'module' | 'breadth'
  language: string
  complexity_tier: number
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
  security_issues: unknown[]
  plagiarism_flags: unknown[]
  architectural_pattern: string
  commit_archetype: string
  raw_signals?: Record<string, unknown>
}

export interface SaveSkillProfileInput {
  session_id: string
  frontend_tier: string
  backend_tier: string
  devops_tier: string
  security_tier: string
  testing_tier: string
  db_design_tier: string
  system_design_tier: string
  overall_tier: string
  percentile_estimate: number
  claimed_tier?: string
  delta_summary: Record<string, unknown>
  commit_archetype: string
  ceiling_applied: boolean
  tutorial_penalty_applied: boolean
  flaw_findings: unknown[]
}

export interface SaveMarketFitInput {
  session_id: string
  matched_roles: unknown[]
  salary_gap_skills: unknown[]
  target_companies: unknown[]
  qualify_now: unknown[]
  qualify_90d: unknown[]
  qualify_6mo: unknown[]
}

export interface SaveRoadmapInput {
  session_id: string
  week_breakdown: unknown[]
  priority_skills: string[]
  complexity_gap_prescription: string
  archetype_prescription: string
  resume_lead_projects: string[]
  resume_bury_projects: string[]
  rewritten_bullets: unknown[]
}

export interface SaveLiveAppAuditInput {
  session_id: string
  url: string
  performance_score?: number
  accessibility_score?: number
  seo_score?: number
  best_practices_score?: number
  fcp_ms?: number
  lcp_ms?: number
  tti_ms?: number
  cls_score?: number
  viewport_results?: unknown[]
  broken_links?: string[]
  has_ssl?: boolean
  raw_lighthouse?: Record<string, unknown>
}

// ──────────────────────────────────────────────
// Audit Sessions
// ──────────────────────────────────────────────

/**
 * Creates a new audit session in `queued` status.
 * Returns the full row including the generated UUID.
 */
export async function createAuditSession(
  data: CreateAuditSessionInput
): Promise<AuditSession> {
  const { data: row, error } = await supabaseAdmin
    .from('audit_sessions')
    .insert({
      github_username: data.github_username,
      github_access_token: data.github_access_token ?? null,
      project_urls: data.project_urls,
      resume_text: data.resume_text ?? null,
      target_branch: data.target_branch ?? null,
      target_module_path: data.target_module_path ?? null,
      status: 'queued',
      progress_percent: 0,
    })
    .select()
    .single()

  if (error || !row) {
    throw new SupabaseQueryError(
      error?.message ?? 'Insert returned no data',
      'audit_sessions',
      'insert',
      error?.code
    )
  }

  return mapAuditSessionRow(row)
}

/**
 * Fetches a single audit session by ID.
 * Returns null if not found instead of throwing.
 */
export async function getAuditSession(
  id: string
): Promise<AuditSession | null> {
  const { data: row, error } = await supabaseAdmin
    .from('audit_sessions')
    .select()
    .eq('id', id)
    .single()

  if (error) {
    // PGRST116 = "no rows returned" — that's a legitimate not-found
    if (error.code === 'PGRST116') return null
    throw new SupabaseQueryError(
      error.message,
      'audit_sessions',
      'select',
      error.code
    )
  }

  if (!row) return null
  return mapAuditSessionRow(row)
}

/**
 * Updates the status and progress_percent of an audit session.
 * Sets `completed_at` automatically when status is 'complete' or 'failed'.
 */
export async function updateAuditSessionStatus(
  id: string,
  status: AuditStatus,
  progressPercent: number,
  errorMessage?: string
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    status,
    progress_percent: progressPercent,
  }

  if (status === 'complete' || status === 'failed') {
    updatePayload.completed_at = new Date().toISOString()
  }

  if (errorMessage !== undefined) {
    updatePayload.error_message = errorMessage
  }

  const { error } = await supabaseAdmin
    .from('audit_sessions')
    .update(updatePayload)
    .eq('id', id)

  if (error) {
    throw new SupabaseQueryError(
      error.message,
      'audit_sessions',
      'update',
      error.code
    )
  }
}

// ──────────────────────────────────────────────
// Authorship Maps
// ──────────────────────────────────────────────

/**
 * Saves one authorship map row (per-file ownership data).
 * Uses upsert keyed on (session_id, repo_name, file_path).
 */
export async function saveAuthorshipMap(
  data: SaveAuthorshipMapInput
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('authorship_maps')
    .insert({
      session_id: data.session_id,
      repo_name: data.repo_name,
      branch_name: data.branch_name,
      file_path: data.file_path,
      owned_line_ranges: data.owned_line_ranges,
      contributed_line_ranges: data.contributed_line_ranges,
      ownership_percent: data.ownership_percent,
      is_tutorial_clone: data.is_tutorial_clone,
      tutorial_clone_confidence: data.tutorial_clone_confidence,
    })

  if (error) {
    throw new SupabaseQueryError(
      error.message,
      'authorship_maps',
      'insert',
      error.code
    )
  }
}

/**
 * Batch inserts multiple authorship maps in a single round-trip.
 */
export async function saveAuthorshipMapsBatch(
  maps: SaveAuthorshipMapInput[]
): Promise<void> {
  if (maps.length === 0) return

  const rows = maps.map((data) => ({
    session_id: data.session_id,
    repo_name: data.repo_name,
    branch_name: data.branch_name,
    file_path: data.file_path,
    owned_line_ranges: data.owned_line_ranges,
    contributed_line_ranges: data.contributed_line_ranges,
    ownership_percent: data.ownership_percent,
    is_tutorial_clone: data.is_tutorial_clone,
    tutorial_clone_confidence: data.tutorial_clone_confidence,
  }))

  const { error } = await supabaseAdmin
    .from('authorship_maps')
    .insert(rows)

  if (error) {
    throw new SupabaseQueryError(
      error.message,
      'authorship_maps',
      'batch_insert',
      error.code
    )
  }
}

// ──────────────────────────────────────────────
// Repository Analyses
// ──────────────────────────────────────────────

/**
 * Saves a single repository analysis result.
 */
export async function saveRepoAnalysis(
  data: SaveRepoAnalysisInput
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('repo_analyses')
    .insert({
      session_id: data.session_id,
      repo_name: data.repo_name,
      branch_name: data.branch_name,
      analysis_scope: data.analysis_scope,
      language: data.language,
      complexity_tier: data.complexity_tier,
      complexity_weight: data.complexity_weight,
      absolute_score: data.absolute_score,
      weighted_score: data.weighted_score,
      api_design_score: data.api_design_score,
      service_layer_score: data.service_layer_score,
      data_access_score: data.data_access_score,
      error_handling_score: data.error_handling_score,
      input_validation_score: data.input_validation_score,
      testing_score: data.testing_score,
      modularity_score: data.modularity_score,
      doc_score: data.doc_score,
      security_issues: data.security_issues,
      plagiarism_flags: data.plagiarism_flags,
      architectural_pattern: data.architectural_pattern,
      commit_archetype: data.commit_archetype,
      raw_signals: data.raw_signals ?? {},
    })

  if (error) {
    throw new SupabaseQueryError(
      error.message,
      'repo_analyses',
      'insert',
      error.code
    )
  }
}

// ──────────────────────────────────────────────
// Skill Profiles
// ──────────────────────────────────────────────

/**
 * Saves or updates a skill profile for a session.
 * Upserts on session_id — only one skill profile per session.
 */
export async function saveSkillProfile(
  data: SaveSkillProfileInput
): Promise<void> {
  // Delete any existing profile for this session, then insert fresh.
  // This avoids needing a unique constraint on session_id for upsert.
  await supabaseAdmin
    .from('skill_profiles')
    .delete()
    .eq('session_id', data.session_id)

  const { error } = await supabaseAdmin
    .from('skill_profiles')
    .insert({
      session_id: data.session_id,
      frontend_tier: data.frontend_tier,
      backend_tier: data.backend_tier,
      devops_tier: data.devops_tier,
      security_tier: data.security_tier,
      testing_tier: data.testing_tier,
      db_design_tier: data.db_design_tier,
      system_design_tier: data.system_design_tier,
      overall_tier: data.overall_tier,
      percentile_estimate: data.percentile_estimate,
      claimed_tier: data.claimed_tier ?? null,
      delta_summary: data.delta_summary,
      commit_archetype: data.commit_archetype,
      ceiling_applied: data.ceiling_applied,
      tutorial_penalty_applied: data.tutorial_penalty_applied,
      flaw_findings: data.flaw_findings,
    })

  if (error) {
    throw new SupabaseQueryError(
      error.message,
      'skill_profiles',
      'insert',
      error.code
    )
  }
}

// ──────────────────────────────────────────────
// Market Fit
// ──────────────────────────────────────────────

/**
 * Saves or replaces the market fit data for a session.
 */
export async function saveMarketFit(
  data: SaveMarketFitInput
): Promise<void> {
  await supabaseAdmin
    .from('market_fit')
    .delete()
    .eq('session_id', data.session_id)

  const { error } = await supabaseAdmin
    .from('market_fit')
    .insert({
      session_id: data.session_id,
      matched_roles: data.matched_roles,
      salary_gap_skills: data.salary_gap_skills,
      target_companies: data.target_companies,
      qualify_now: data.qualify_now,
      qualify_90d: data.qualify_90d,
      qualify_6mo: data.qualify_6mo,
    })

  if (error) {
    throw new SupabaseQueryError(
      error.message,
      'market_fit',
      'insert',
      error.code
    )
  }
}

// ──────────────────────────────────────────────
// Roadmaps
// ──────────────────────────────────────────────

/**
 * Saves or replaces the roadmap for a session.
 */
export async function saveRoadmap(
  data: SaveRoadmapInput
): Promise<void> {
  await supabaseAdmin
    .from('roadmaps')
    .delete()
    .eq('session_id', data.session_id)

  const { error } = await supabaseAdmin
    .from('roadmaps')
    .insert({
      session_id: data.session_id,
      week_breakdown: data.week_breakdown,
      priority_skills: data.priority_skills,
      complexity_gap_prescription: data.complexity_gap_prescription,
      archetype_prescription: data.archetype_prescription,
      resume_lead_projects: data.resume_lead_projects,
      resume_bury_projects: data.resume_bury_projects,
      rewritten_bullets: data.rewritten_bullets,
    })

  if (error) {
    throw new SupabaseQueryError(
      error.message,
      'roadmaps',
      'insert',
      error.code
    )
  }
}

// ──────────────────────────────────────────────
// Live App Audits
// ──────────────────────────────────────────────

/**
 * Saves a Lighthouse-based live app audit result.
 */
export async function saveLiveAppAudit(
  data: SaveLiveAppAuditInput
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('live_app_audits')
    .insert({
      session_id: data.session_id,
      url: data.url,
      performance_score: data.performance_score ?? null,
      accessibility_score: data.accessibility_score ?? null,
      seo_score: data.seo_score ?? null,
      best_practices_score: data.best_practices_score ?? null,
      fcp_ms: data.fcp_ms ?? null,
      lcp_ms: data.lcp_ms ?? null,
      tti_ms: data.tti_ms ?? null,
      cls_score: data.cls_score ?? null,
      viewport_results: data.viewport_results ?? [],
      broken_links: data.broken_links ?? [],
      has_ssl: data.has_ssl ?? false,
      raw_lighthouse: data.raw_lighthouse ?? {},
    })

  if (error) {
    throw new SupabaseQueryError(
      error.message,
      'live_app_audits',
      'insert',
      error.code
    )
  }
}

// ──────────────────────────────────────────────
// Full Report (aggregate query)
// ──────────────────────────────────────────────

/**
 * Assembles the full audit report by fetching all child tables
 * for a given session ID in parallel.
 *
 * Throws if the session itself doesn't exist.
 */
export async function getFullReport(
  sessionId: string
): Promise<FullReport> {
  // Fetch everything in parallel for speed
  const [
    sessionResult,
    authorshipResult,
    analysesResult,
    profileResult,
    marketResult,
    roadmapResult,
    liveAuditResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('audit_sessions')
      .select()
      .eq('id', sessionId)
      .single(),
    supabaseAdmin
      .from('authorship_maps')
      .select()
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('repo_analyses')
      .select()
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('skill_profiles')
      .select()
      .eq('session_id', sessionId)
      .single(),
    supabaseAdmin
      .from('market_fit')
      .select()
      .eq('session_id', sessionId)
      .single(),
    supabaseAdmin
      .from('roadmaps')
      .select()
      .eq('session_id', sessionId)
      .single(),
    supabaseAdmin
      .from('live_app_audits')
      .select()
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }),
  ])

  // Session is required
  if (sessionResult.error || !sessionResult.data) {
    throw new SupabaseQueryError(
      sessionResult.error?.message ?? 'Session not found',
      'audit_sessions',
      'select',
      sessionResult.error?.code
    )
  }

  const session = mapAuditSessionRow(sessionResult.data)

  // Authorship maps
  if (authorshipResult.error) {
    throw new SupabaseQueryError(
      authorshipResult.error.message,
      'authorship_maps',
      'select',
      authorshipResult.error.code
    )
  }

  // Repo analyses
  if (analysesResult.error) {
    throw new SupabaseQueryError(
      analysesResult.error.message,
      'repo_analyses',
      'select',
      analysesResult.error.code
    )
  }

  // Extract flaw findings from skill profile row
  const flawFindings: AuditFlawFinding[] =
    (profileResult.data?.flaw_findings as AuditFlawFinding[] | undefined) ?? []

  return {
    session,
    authorshipMaps: (authorshipResult.data ?? []).map(mapAuthorshipRow),
    repoAnalyses: (analysesResult.data ?? []).map(mapRepoAnalysisRow),
    skillProfile: profileResult.data
      ? mapSkillProfileRow(profileResult.data)
      : null,
    marketFit: marketResult.data
      ? mapMarketFitRow(marketResult.data)
      : null,
    roadmap: roadmapResult.data
      ? mapRoadmapRow(roadmapResult.data)
      : null,
    flawFindings,
    liveAppAudits: (liveAuditResult.data ?? []) as LiveAppAuditRow[],
  }
}

// ──────────────────────────────────────────────
// Row → Domain Type Mappers
// ──────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapAuditSessionRow(row: any): AuditSession {
  return {
    id: row.id,
    github_username: row.github_username,
    project_urls: row.project_urls ?? [],
    resume_text: row.resume_text ?? undefined,
    target_branch: row.target_branch ?? undefined,
    target_module_path: row.target_module_path ?? undefined,
    status: row.status as AuditStatus,
    progress_percent: row.progress_percent ?? 0,
    created_at: row.created_at,
    completed_at: row.completed_at ?? undefined,
  }
}

function mapAuthorshipRow(row: any): AuthorshipMap {
  return {
    id: row.id,
    session_id: row.session_id,
    repo_name: row.repo_name,
    branch_name: row.branch_name,
    file_path: row.file_path,
    owned_line_ranges: row.owned_line_ranges ?? [],
    contributed_line_ranges: row.contributed_line_ranges ?? [],
    ownership_percent: row.ownership_percent ?? 0,
    is_tutorial_clone: row.is_tutorial_clone ?? false,
    tutorial_clone_confidence: row.tutorial_clone_confidence ?? 0,
  }
}

function mapRepoAnalysisRow(row: any): RepoAnalysis {
  return {
    id: row.id,
    session_id: row.session_id,
    repo_name: row.repo_name,
    branch_name: row.branch_name,
    analysis_scope: row.analysis_scope ?? 'breadth',
    language: row.language ?? 'unknown',
    complexity_tier: row.complexity_tier ?? 1,
    complexity_weight: row.complexity_weight ?? 0,
    absolute_score: row.absolute_score ?? 0,
    weighted_score: row.weighted_score ?? 0,
    api_design_score: row.api_design_score ?? 0,
    service_layer_score: row.service_layer_score ?? 0,
    data_access_score: row.data_access_score ?? 0,
    error_handling_score: row.error_handling_score ?? 0,
    input_validation_score: row.input_validation_score ?? 0,
    testing_score: row.testing_score ?? 0,
    modularity_score: row.modularity_score ?? 0,
    doc_score: row.doc_score ?? 0,
    security_issues: row.security_issues ?? [],
    plagiarism_flags: row.plagiarism_flags ?? [],
    architectural_pattern: row.architectural_pattern ?? '',
    commit_archetype: row.commit_archetype ?? 'Ghost',
  }
}

function mapSkillProfileRow(row: any): SkillProfile {
  return {
    id: row.id,
    session_id: row.session_id,
    frontend_tier: row.frontend_tier ?? 'Beginner',
    backend_tier: row.backend_tier ?? 'Beginner',
    devops_tier: row.devops_tier ?? 'Beginner',
    security_tier: row.security_tier ?? 'Beginner',
    testing_tier: row.testing_tier ?? 'Beginner',
    db_design_tier: row.db_design_tier ?? 'Beginner',
    system_design_tier: row.system_design_tier ?? 'Beginner',
    overall_tier: row.overall_tier ?? 'Beginner',
    percentile_estimate: row.percentile_estimate ?? 0,
    claimed_tier: row.claimed_tier ?? undefined,
    delta_summary: row.delta_summary ?? {
      claimed: 'Not stated',
      verified: 'Beginner',
      gap_areas: [],
      strengths: [],
    },
    commit_archetype: row.commit_archetype ?? 'Ghost',
    ceiling_applied: row.ceiling_applied ?? false,
    tutorial_penalty_applied: row.tutorial_penalty_applied ?? false,
  }
}

function mapMarketFitRow(row: any): MarketFit {
  return {
    id: row.id,
    session_id: row.session_id,
    matched_roles: row.matched_roles ?? [],
    salary_gap_skills: row.salary_gap_skills ?? [],
    target_companies: row.target_companies ?? [],
    qualify_now: row.qualify_now ?? [],
    qualify_90d: row.qualify_90d ?? [],
    qualify_6mo: row.qualify_6mo ?? [],
  }
}

function mapRoadmapRow(row: any): Roadmap {
  return {
    id: row.id,
    session_id: row.session_id,
    week_breakdown: row.week_breakdown ?? [],
    priority_skills: row.priority_skills ?? [],
    complexity_gap_prescription: row.complexity_gap_prescription ?? '',
    archetype_prescription: row.archetype_prescription ?? '',
    resume_lead_projects: row.resume_lead_projects ?? [],
    resume_bury_projects: row.resume_bury_projects ?? [],
    recommendations: row.rewritten_bullets ?? [],
  }
}
