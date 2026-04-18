-- DevCareer Intelligence: Initial Schema
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (Custom app users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id TEXT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  github_token_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit sessions
CREATE TABLE audit_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_username TEXT NOT NULL,
  github_access_token TEXT,
  project_urls TEXT[] DEFAULT '{}',
  resume_text TEXT,
  target_branch TEXT,
  target_module_path TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  progress_percent INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Authorship maps
CREATE TABLE authorship_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
  repo_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  owned_line_ranges JSONB DEFAULT '[]',
  contributed_line_ranges JSONB DEFAULT '[]',
  ownership_percent FLOAT DEFAULT 0,
  is_tutorial_clone BOOLEAN DEFAULT FALSE,
  tutorial_clone_confidence FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fetched repos
CREATE TABLE IF NOT EXISTS fetched_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
  repo_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  repo_meta JSONB DEFAULT '{}',
  commit_count INTEGER DEFAULT 0,
  languages JSONB DEFAULT '{}',
  file_count INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, repo_name)
);

-- Repository analyses
CREATE TABLE repo_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
  repo_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  analysis_scope TEXT NOT NULL DEFAULT 'breadth',
  language TEXT,
  complexity_tier INTEGER DEFAULT 1,
  complexity_weight FLOAT DEFAULT 0,
  absolute_score FLOAT DEFAULT 0,
  weighted_score FLOAT DEFAULT 0,
  api_design_score FLOAT DEFAULT 0,
  service_layer_score FLOAT DEFAULT 0,
  data_access_score FLOAT DEFAULT 0,
  error_handling_score FLOAT DEFAULT 0,
  input_validation_score FLOAT DEFAULT 0,
  testing_score FLOAT DEFAULT 0,
  modularity_score FLOAT DEFAULT 0,
  doc_score FLOAT DEFAULT 0,
  security_issues JSONB DEFAULT '[]',
  plagiarism_flags JSONB DEFAULT '[]',
  architectural_pattern TEXT,
  commit_archetype TEXT,
  raw_signals JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill profiles
CREATE TABLE skill_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
  frontend_tier TEXT,
  backend_tier TEXT,
  devops_tier TEXT,
  security_tier TEXT,
  testing_tier TEXT,
  db_design_tier TEXT,
  system_design_tier TEXT,
  overall_tier TEXT,
  percentile_estimate FLOAT DEFAULT 0,
  claimed_tier TEXT,
  delta_summary JSONB DEFAULT '{}',
  commit_archetype TEXT,
  ceiling_applied BOOLEAN DEFAULT FALSE,
  tutorial_penalty_applied BOOLEAN DEFAULT FALSE,
  flaw_findings JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market fit
CREATE TABLE market_fit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
  matched_roles JSONB DEFAULT '[]',
  salary_gap_skills JSONB DEFAULT '[]',
  target_companies JSONB DEFAULT '[]',
  qualify_now JSONB DEFAULT '[]',
  qualify_90d JSONB DEFAULT '[]',
  qualify_6mo JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roadmaps
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
  week_breakdown JSONB DEFAULT '[]',
  priority_skills TEXT[] DEFAULT '{}',
  complexity_gap_prescription TEXT,
  archetype_prescription TEXT,
  resume_lead_projects TEXT[] DEFAULT '{}',
  resume_bury_projects TEXT[] DEFAULT '{}',
  rewritten_bullets JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live app audits
CREATE TABLE live_app_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  performance_score FLOAT,
  accessibility_score FLOAT,
  seo_score FLOAT,
  best_practices_score FLOAT,
  fcp_ms FLOAT,
  lcp_ms FLOAT,
  tti_ms FLOAT,
  cls_score FLOAT,
  viewport_results JSONB DEFAULT '[]',
  broken_links TEXT[] DEFAULT '{}',
  has_ssl BOOLEAN DEFAULT FALSE,
  raw_lighthouse JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_audit_sessions_github_username ON audit_sessions(github_username);
CREATE INDEX idx_authorship_maps_session_id ON authorship_maps(session_id);
CREATE INDEX idx_repo_analyses_session_id ON repo_analyses(session_id);
CREATE INDEX idx_skill_profiles_session_id ON skill_profiles(session_id);
CREATE INDEX idx_market_fit_session_id ON market_fit(session_id);
CREATE INDEX idx_roadmaps_session_id ON roadmaps(session_id);

-- Row Level Security (disabled for service role, enabled for anon)
ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorship_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_fit ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_app_audits ENABLE ROW LEVEL SECURITY;

-- Public read policy for share URLs
DROP POLICY IF EXISTS "Public read on completed sessions" ON audit_sessions;
CREATE POLICY "Public read on completed sessions" ON audit_sessions
  FOR SELECT USING (status = 'complete');
