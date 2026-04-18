import type { ComplexityTier, CareerTier, CommitArchetype } from './index'

export interface ASTNode {
  type: string
  startPosition: { row: number; column: number }
  endPosition: { row: number; column: number }
  text?: string
  children: ASTNode[]
  namedChildren: ASTNode[]
}

export interface ParsedFile {
  path: string
  language: string
  content: string
  ast?: ASTNode
  lineCount: number
  byteSize: number
}

export interface ComplexityAnalysis {
  file_path: string
  cyclomatic_complexity: number
  cognitive_complexity: number
  halstead_volume: number
  maintainability_index: number
  lines_of_code: number
  comment_lines: number
  blank_lines: number
  function_count: number
  class_count: number
  tier: ComplexityTier
}

export interface ModuleInfo {
  name: string
  path: string
  language: string
  purpose: string
  is_entry_point: boolean
  dependencies: string[]
  exports: string[]
  complexity: ComplexityAnalysis
}

export interface QualityDimension {
  name: string
  score: number
  max_score: number
  weight: number
  evidence: string[]
  deductions: QualityDeduction[]
}

export interface QualityDeduction {
  reason: string
  points: number
  file: string
  line?: number
}

export interface QualityReport {
  file_path: string
  repo_name: string
  dimensions: QualityDimension[]
  total_score: number
  weighted_score: number
  tier: CareerTier
  critical_issues: string[]
}

export interface AttributionResult {
  file_path: string
  repo_name: string
  author_email: string
  owned_lines: number
  total_lines: number
  ownership_percent: number
  blame_ranges: BlameAttributionRange[]
}

export interface BlameAttributionRange {
  start_line: number
  end_line: number
  commit_sha: string
  author_email: string
  authored_date: string
  is_owned: boolean
}

export interface TutorialSignal {
  signal_type: 'commit_message' | 'file_name' | 'code_pattern' | 'repo_name' | 'readme'
  value: string
  confidence: number
  explanation: string
}

export interface TutorialDetectionResult {
  repo_name: string
  is_tutorial: boolean
  confidence: number
  signals: TutorialSignal[]
  source_hints: string[]
}

export interface SecurityScanResult {
  file_path: string
  rule_id: string
  rule_name: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  line_start: number
  line_end: number
  column_start: number
  column_end: number
  fix_suggestion?: string
  cwe?: string
  owasp?: string
}

export interface CommitPatternAnalysis {
  total_commits: number
  commit_frequency_per_week: number
  avg_files_per_commit: number
  avg_lines_per_commit: number
  message_quality_score: number
  archetype: CommitArchetype
  evidence: string[]
}

export interface TutorialCloneResult {
  is_tutorial_clone: boolean
  confidence: number
  signals_triggered: string[]
  penalty_multiplier: number
}

export interface ComplexityClassification {
  tier: ComplexityTier
  depth: number
  domain: number
  complexity_weight: number
  indicators_found: string[]
}

export interface ModuleDetectionResult {
  framework: string
  analysis_mode: 'module' | 'breadth'
  target_module: string | null
  detected_modules: string[]
  module_complexity_score: number
  module_concentration: number
}

