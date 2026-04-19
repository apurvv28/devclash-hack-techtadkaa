'use client'

import React, { useState } from 'react'
import { Share2, BarChart3, Target, Map, FileText, AlertTriangle, Copy, Check, ChevronDown, ChevronUp, Code2 } from 'lucide-react'
import type { AuditReport } from '@/types/audit'
import { SkillRadarChart } from '@/components/dashboard/SkillRadarChart'
import { TierBadge } from '@/components/dashboard/TierBadge'
import { FlawFindingsPanel } from '@/components/dashboard/FlawFindingsPanel'
import { MarketFitPanel } from '@/components/dashboard/MarketFitPanel'
import { SalaryGapChart } from '@/components/dashboard/SalaryGapChart'
import { RoadmapView } from '@/components/dashboard/RoadmapView'
import { ResumeDamageReport } from '@/components/dashboard/ResumeDamageReport'
import { UiUxTestPanel } from '@/components/dashboard/UiUxTestPanel'

interface ReportDashboardClientProps {
  report: AuditReport
  isPublicShare?: boolean
}

type TabKey = 'findings' | 'repos' | 'market' | 'roadmap' | 'resume' | 'uiux'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'findings', label: 'Findings', icon: AlertTriangle },
  { key: 'repos', label: 'Repos', icon: Code2 },
  { key: 'uiux', label: 'UI/UX', icon: BarChart3 },
  { key: 'market', label: 'Market', icon: Target },
  { key: 'roadmap', label: 'Roadmap', icon: Map },
  { key: 'resume', label: 'Resume', icon: FileText },
]

export function ReportDashboardClient({ report, isPublicShare = false }: ReportDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('findings')
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle')

  const { session, skill_profile, market_fit, roadmap, flaw_findings, repo_analyses } = report

  const handleShare = async () => {
    setShareState('loading')
    try {
      if (isPublicShare) {
        await navigator.clipboard.writeText(window.location.href)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 3000)
        return
      }

      const res = await fetch(`/api/audit/${session.id}/share`, { method: 'POST' })
      const data = await res.json()
      if (data.token) {
        const origin = window.location.origin
        const publicShareUrl = `${origin}/share/${data.token}`
        await navigator.clipboard.writeText(publicShareUrl)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 3000)
      } else if (data.share_url) {
        await navigator.clipboard.writeText(data.share_url)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 3000)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 3000)
      }
    } catch {
      await navigator.clipboard.writeText(window.location.href)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 3000)
    }
  }

  return (
    <div className={isPublicShare ? 'min-h-screen bg-[#F8F9FA]' : ''}>
      {/* Report header — only shown on public share (dashboard layout provides navbar otherwise) */}
      {isPublicShare && (
        <nav className="sticky top-0 z-50 glass border-b border-white/40 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A1E4] to-[#003882] flex items-center justify-center text-white font-bold text-sm shadow-md">
                {session.github_username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[#1A202C] font-semibold text-sm">@{session.github_username}</p>
                <p className="text-[#718096] text-xs">
                  {repo_analyses.length} repos analyzed · {new Date(report.generated_at).toLocaleDateString()}
                </p>
              </div>
              {skill_profile && (
                <span className="ml-2 text-xs px-3 py-1 rounded-lg bg-[#003882]/10 text-[#003882] border border-[#003882]/20 font-bold">
                  {skill_profile.overall_tier}
                </span>
              )}
            </div>
            <button
              id="share-report-btn"
              onClick={handleShare}
              disabled={shareState === 'loading'}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00A1E4] to-[#003882] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {shareState === 'copied' ? (
                <><Check className="w-3.5 h-3.5" /> Link Copied!</>
              ) : (
                <><Share2 className="w-3.5 h-3.5" /> Share Report</>
              )}
            </button>
          </div>
        </nav>
      )}

      <CloneWarningAlert repos={repo_analyses} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Inline report header for dashboard layout */}
        {!isPublicShare && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00A1E4] to-[#003882] flex items-center justify-center text-white font-bold text-base shadow-lg">
                {session.github_username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-[#1A202C] font-bold text-lg">@{session.github_username}</p>
                  {skill_profile && (
                    <span className="text-xs px-3 py-1 rounded-lg bg-[#003882]/10 text-[#003882] border border-[#003882]/20 font-bold">
                      {skill_profile.overall_tier}
                    </span>
                  )}
                </div>
                <p className="text-[#718096] text-sm">
                  {repo_analyses.length} repos analyzed · {new Date(report.generated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              id="share-report-btn"
              onClick={handleShare}
              disabled={shareState === 'loading'}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00A1E4] to-[#003882] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-[#003882]/20 transition-all disabled:opacity-50"
            >
              {shareState === 'copied' ? (
                <><Check className="w-4 h-4" /> Copied!</>
              ) : (
                <><Share2 className="w-4 h-4" /> Share Report</>
              )}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left column — 40% */}
          <div className="lg:col-span-5 space-y-6">
            {skill_profile && (
              <>
                <SkillRadarChart skills={skill_profile} />
                <TierBadge
                  tier={skill_profile.overall_tier}
                  percentile={skill_profile.percentile_estimate}
                  archetype={skill_profile.commit_archetype}
                  ceilingApplied={skill_profile.ceiling_applied}
                  tutorialPenaltyApplied={skill_profile.tutorial_penalty_applied}
                />

                {/* Delta summary */}
                {skill_profile.delta_summary && (
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
                    <h4 className="font-semibold text-sm text-[#1A202C]">Gap Analysis</h4>
                    {skill_profile.delta_summary.strengths.length > 0 && (
                      <div>
                        <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-bold mb-1">Strengths</p>
                        <div className="flex flex-wrap gap-1.5">
                          {skill_profile.delta_summary.strengths.map((s) => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {skill_profile.delta_summary.gap_areas.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[#E2001A] uppercase tracking-wider font-bold mb-1">Gap Areas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {skill_profile.delta_summary.gap_areas.map((g) => (
                            <span key={g} className="text-xs px-2 py-0.5 rounded bg-red-50 text-[#E2001A] border border-red-200 font-medium">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Salary gap chart */}
                {market_fit?.salary_gap_skills && (
                  <SalaryGapChart skills={market_fit.salary_gap_skills} />
                )}
              </>
            )}
          </div>

          {/* Right column — 60% */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tab bar */}
            <div className="flex bg-white rounded-2xl p-1.5 border border-[#E2E8F0] shadow-sm overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-3 px-3 rounded-xl transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'bg-gradient-to-r from-[#00A1E4]/10 to-[#003882]/10 text-[#003882] shadow-sm border border-[#003882]/15'
                        : 'text-[#718096] hover:text-[#4A5568] hover:bg-[#F8F9FA]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div>
              {activeTab === 'findings' && (
                <FlawFindingsPanel findings={flaw_findings || []} />
              )}

              {activeTab === 'repos' && (
                <RepoScoreBreakdown repos={repo_analyses} />
              )}

              {activeTab === 'uiux' && (
                <UiUxTestPanel session={session} initialResult={report.live_app_audit?.raw_lighthouse} isPublicShare={isPublicShare} />
              )}

              {activeTab === 'market' && market_fit && (
                <MarketFitPanel
                  qualifyNow={market_fit.qualify_now || []}
                  qualify90d={market_fit.qualify_90d || []}
                  qualify6mo={market_fit.qualify_6mo || []}
                />
              )}

              {activeTab === 'roadmap' && roadmap && (
                <RoadmapView
                  weeks={roadmap.week_breakdown || []}
                  prioritySkills={roadmap.priority_skills || []}
                />
              )}

              {activeTab === 'resume' && roadmap && (
                <ResumeDamageReport
                  leadProjects={roadmap?.resume_lead_projects || []}
                  buryProjects={roadmap?.resume_bury_projects || []}
                  repoAnalyses={repo_analyses || []}
                  recommendations={roadmap?.recommendations || []}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Per-Repo Score Breakdown ──
function RepoScoreBreakdown({ repos }: { repos: import('@/types/index').RepoAnalysis[] }) {
  const [expandedRepo, setExpandedRepo] = useState<string | null>(repos.length === 1 ? repos[0].id : null)

  if (repos.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center shadow-sm">
        <p className="text-[#718096] text-sm">No repository analyses available.</p>
      </div>
    )
  }

  const SCORE_DIMS = [
    { key: 'api_design_score', label: 'API Design', color: '#003882' },
    { key: 'service_layer_score', label: 'Service Layer', color: '#00A1E4' },
    { key: 'data_access_score', label: 'Data Access', color: '#0891B2' },
    { key: 'error_handling_score', label: 'Error Handling', color: '#059669' },
    { key: 'input_validation_score', label: 'Input Validation', color: '#D97706' },
    { key: 'testing_score', label: 'Testing', color: '#7C3AED' },
    { key: 'modularity_score', label: 'Modularity', color: '#DB2777' },
    { key: 'doc_score', label: 'Documentation', color: '#4F46E5' },
  ] as const

  const tierForScore = (score: number) => {
    if (score >= 90) return { label: 'Staff', color: 'text-yellow-700 bg-yellow-50 border-yellow-300' }
    if (score >= 78) return { label: 'Senior', color: 'text-amber-700 bg-amber-50 border-amber-300' }
    if (score >= 65) return { label: 'Mid+', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
    if (score >= 52) return { label: 'Mid', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
    if (score >= 38) return { label: 'Junior+', color: 'text-sky-700 bg-sky-50 border-sky-200' }
    if (score >= 22) return { label: 'Junior', color: 'text-blue-600 bg-blue-50 border-blue-200' }
    return { label: 'Beginner', color: 'text-gray-600 bg-gray-50 border-gray-200' }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-[#1A202C]">
          Per-Repository Analysis
          <span className="text-sm font-normal text-[#718096] ml-2">({repos.length} repos)</span>
        </h3>
      </div>

      {repos.map((repo) => {
        const isExpanded = expandedRepo === repo.id
        const repoName = repo.repo_name.split('/').pop() || repo.repo_name
        const overallTier = tierForScore(repo.weighted_score)

        return (
          <div key={repo.id} className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setExpandedRepo(isExpanded ? null : repo.id)}
              className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-[#F8F9FA] transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F0F4F8] to-white border border-[#E2E8F0] flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-[#003882]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <p className="font-bold text-sm text-[#1A202C]">{repoName}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${overallTier.color}`}>
                      {overallTier.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#F0F4F8] text-[#718096] border border-[#E2E8F0] font-bold">
                      {repo.language}
                    </span>
                  </div>
                  <p className="text-xs text-[#718096] mt-0.5">
                    Score: {repo.weighted_score}/100 · Complexity: T{repo.complexity_tier} · {repo.security_issues.length} security issues
                  </p>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-[#718096]" /> : <ChevronDown className="w-4 h-4 text-[#718096]" />}
            </button>

            {isExpanded && (
              <div className="border-t border-[#E2E8F0] px-6 py-5 space-y-4">
                {/* Score bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SCORE_DIMS.map((dim) => {
                    const score = repo[dim.key] as number
                    return (
                      <div key={dim.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#4A5568]">{dim.label}</span>
                          <span className="text-xs font-bold text-[#1A202C]">{score}</span>
                        </div>
                        <div className="w-full h-2 bg-[#F0F4F8] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${score}%`, backgroundColor: dim.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Additional info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="bg-[#F8F9FA] rounded-xl px-3 py-2.5 border border-[#E2E8F0]">
                    <p className="text-[10px] text-[#718096] uppercase tracking-wider font-medium">Absolute Score</p>
                    <p className="text-base font-bold text-[#003882]">{repo.absolute_score}</p>
                  </div>
                  <div className="bg-[#F8F9FA] rounded-xl px-3 py-2.5 border border-[#E2E8F0]">
                    <p className="text-[10px] text-[#718096] uppercase tracking-wider font-medium">Weighted Score</p>
                    <p className="text-base font-bold text-[#1A202C]">{repo.weighted_score}</p>
                  </div>
                  <div className="bg-[#F8F9FA] rounded-xl px-3 py-2.5 border border-[#E2E8F0]">
                    <p className="text-[10px] text-[#718096] uppercase tracking-wider font-medium">Architecture</p>
                    <p className="text-xs font-bold text-[#4A5568] truncate">{repo.architectural_pattern || 'N/A'}</p>
                  </div>
                  <div className="bg-[#F8F9FA] rounded-xl px-3 py-2.5 border border-[#E2E8F0]">
                    <p className="text-[10px] text-[#718096] uppercase tracking-wider font-medium">Scope</p>
                    <p className="text-xs font-bold text-[#4A5568] capitalize">{repo.analysis_scope}</p>
                  </div>
                </div>

                {/* Security issues summary */}
                {repo.security_issues.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-[#E2001A]">{repo.security_issues.length} Security Issue(s)</p>
                    <div className="flex gap-2 mt-1.5">
                      {['critical', 'high', 'medium', 'low'].map((severity) => {
                        const count = repo.security_issues.filter(i => i.severity === severity).length
                        if (count === 0) return null
                        return (
                          <span key={severity} className="text-[10px] text-[#718096] font-medium">
                            {count} {severity}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Plagiarism flags */}
                {repo.plagiarism_flags.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-amber-700">⚠ Tutorial/Clone Signals</p>
                    <div className="mt-1.5 space-y-1">
                      {repo.plagiarism_flags.map((flag, i) => (
                        <p key={i} className="text-[10px] text-amber-600 font-medium">
                          {flag.source_hint} (confidence: {Math.round(flag.similarity_score * 100)}%)
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CloneWarningAlert({ repos }: { repos: import('@/types/index').RepoAnalysis[] }) {
  const [isOpen, setIsOpen] = useState(true)
  const cloneRepos = repos.filter(r => r.plagiarism_flags && r.plagiarism_flags.length > 0)

  if (!isOpen || cloneRepos.length === 0) return null

  return (
    <div className="max-w-7xl mx-auto px-6 mt-6">
      <div className="bg-[#FFF5F5] border border-[#FC8181] rounded-xl p-4 flex items-start gap-4 relative shadow-sm">
        <div className="p-2 bg-[#FED7D7] rounded-lg">
          <AlertTriangle className="w-5 h-5 text-[#C53030]" />
        </div>
        <div className="flex-1 pr-8">
          <h4 className="text-[#9B2C2C] font-bold text-sm">Clone / Forked Repositories Detected</h4>
          <p className="text-[#C53030] text-xs mt-1 leading-relaxed font-medium">
            We detected that some of your submitted projects ({cloneRepos.map(r => r.repo_name).join(', ')}) heavily resemble public tutorials, clones, or boilerplate code. The analysis has been strict, filtering only your specific contributions, and a <b>skill-tier penalty</b> has been applied to account for unoriginal architecture.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-[#C53030] hover:text-[#9B2C2C] p-1"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
