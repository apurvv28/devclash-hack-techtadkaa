'use client'

import React, { useState } from 'react'
import { Share2, BarChart3, Target, Map, FileText, AlertTriangle, Copy, Check } from 'lucide-react'
import type { AuditReport } from '@/types/audit'
import { SkillRadarChart } from '@/components/dashboard/SkillRadarChart'
import { TierBadge } from '@/components/dashboard/TierBadge'
import { FlawFindingsPanel } from '@/components/dashboard/FlawFindingsPanel'
import { MarketFitPanel } from '@/components/dashboard/MarketFitPanel'
import { SalaryGapChart } from '@/components/dashboard/SalaryGapChart'
import { RoadmapView } from '@/components/dashboard/RoadmapView'
import { ResumeDamageReport } from '@/components/dashboard/ResumeDamageReport'

interface ReportDashboardClientProps {
  report: AuditReport
}

type TabKey = 'findings' | 'market' | 'roadmap' | 'resume'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'findings', label: 'Findings', icon: AlertTriangle },
  { key: 'market', label: 'Market', icon: Target },
  { key: 'roadmap', label: 'Roadmap', icon: Map },
  { key: 'resume', label: 'Resume', icon: FileText },
]

export function ReportDashboardClient({ report }: ReportDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('findings')
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle')

  const { session, skill_profile, market_fit, roadmap, flaw_findings, repo_analyses } = report

  const handleShare = async () => {
    setShareState('loading')
    try {
      const res = await fetch(`/api/audit/${session.id}/share`, { method: 'POST' })
      const data = await res.json()
      if (data.share_url) {
        await navigator.clipboard.writeText(data.share_url)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 3000)
      } else {
        // Fallback: copy current URL
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
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Sticky top nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E2E8F0] shadow-sm">
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

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="text-xs text-[#718096] hover:text-[#4A5568] font-medium transition"
            >
              ← Dashboard
            </a>
            <button
              id="share-report-btn"
              onClick={handleShare}
              disabled={shareState === 'loading'}
              className="inline-flex items-center gap-2 bg-[#003882] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#002B66] transition disabled:opacity-50"
            >
              {shareState === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" /> Share Report
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      <CloneWarningAlert repos={repo_analyses} />

      <div className="max-w-7xl mx-auto px-6 py-8">
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
            <div className="flex bg-white rounded-xl p-1 border border-[#E2E8F0] shadow-sm">
              {TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-3 px-4 rounded-lg transition-all duration-200 ${
                      activeTab === tab.key
                        ? 'bg-gradient-to-r from-[#00A1E4]/10 to-[#003882]/10 text-[#003882] shadow-sm border border-[#003882]/15'
                        : 'text-[#718096] hover:text-[#4A5568] hover:bg-[#F8F9FA]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div>
              {activeTab === 'findings' && (
                <FlawFindingsPanel findings={flaw_findings || []} />
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
                  leadProjects={roadmap.resume_lead_projects || []}
                  buryProjects={roadmap.resume_bury_projects || []}
                  repoAnalyses={repo_analyses || []}
                  rewrittenBullets={roadmap.rewritten_bullets || []}
                />
              )}
            </div>
          </div>
        </div>
      </div>
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
