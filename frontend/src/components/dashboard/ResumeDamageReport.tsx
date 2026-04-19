'use client'

import React from 'react'
import type { RepoAnalysis, ComplexityTier } from '@/types/index'

interface ResumeDamageReportProps {
  leadProjects: string[]
  buryProjects: string[]
  repoAnalyses: RepoAnalysis[]
  recommendations?: { title: string; recommendation: string; evidence_source: string; priority: 'high' | 'medium' | 'low' }[]
}

const COMPLEXITY_LABELS: Record<ComplexityTier, string> = {
  1: 'Trivial',
  2: 'Simple',
  3: 'Moderate',
  4: 'Complex',
  5: 'Advanced',
}

export function ResumeDamageReport({ leadProjects, buryProjects, repoAnalyses, recommendations }: ResumeDamageReportProps) {
  const leadRepos = repoAnalyses.filter((r) => leadProjects.includes(r.repo_name))
  const buryRepos = repoAnalyses.filter((r) => buryProjects.includes(r.repo_name))
  // buryProjects that aren't in repoAnalyses (still should be shown)
  const buryOnlyNames = buryProjects.filter((name) => !repoAnalyses.some((r) => r.repo_name === name))

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[#1A202C]">Resume Damage Report</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lead With These */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <h4 className="font-semibold text-emerald-700 text-sm uppercase tracking-wider">Lead With These</h4>
          </div>
          <div className="space-y-3">
            {leadRepos.length === 0 && leadProjects.length === 0 ? (
              <p className="text-[#718096] text-sm italic">No standout projects identified</p>
            ) : (
              <>
                {leadRepos.map((repo) => (
                  <div key={repo.id} className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
                    <p className="text-[#1A202C] font-semibold text-sm">{repo.repo_name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold">
                        Score: {repo.weighted_score.toFixed(1)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#003882]/10 text-[#003882] border border-[#003882]/20 font-bold">
                        {COMPLEXITY_LABELS[repo.complexity_tier]} (T{repo.complexity_tier})
                      </span>
                    </div>
                  </div>
                ))}
                {/* Lead projects not in repoAnalyses  */}
                {leadProjects
                  .filter((name) => !repoAnalyses.some((r) => r.repo_name === name))
                  .map((name) => (
                    <div key={name} className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
                      <p className="text-[#1A202C] font-semibold text-sm">{name}</p>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>

        {/* Remove These */}
        <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#E2001A]" />
            <h4 className="font-semibold text-[#E2001A] text-sm uppercase tracking-wider">Remove These</h4>
          </div>
          <div className="space-y-3">
            {buryRepos.length === 0 && buryOnlyNames.length === 0 ? (
              <p className="text-[#718096] text-sm italic">No projects to remove</p>
            ) : (
              <>
                {buryRepos.map((repo) => (
                  <div key={repo.id} className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    <p className="text-[#1A202C] font-semibold text-sm">{repo.repo_name}</p>
                    <p className="text-xs text-[#718096] mt-1">
                      Low weighted score ({repo.weighted_score.toFixed(1)}) — hurts credibility
                    </p>
                  </div>
                ))}
                {buryOnlyNames.map((name) => (
                  <div key={name} className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    <p className="text-[#1A202C] font-semibold text-sm">{name}</p>
                    <p className="text-xs text-[#718096] mt-1">
                      Weakens profile — consider removing
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Strategic Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <ResumeRecommendationsPanel recommendations={recommendations} />
      )}
    </div>
  )
}

/* ─── Inline Recommendations Panel ─── */

interface ResumeRecommendationsPanelProps {
  recommendations: { title: string; recommendation: string; evidence_source: string; priority: 'high' | 'medium' | 'low' }[]
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 text-[#E2001A] border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-[#003882] border-blue-200',
}

function ResumeRecommendationsPanel({ recommendations }: ResumeRecommendationsPanelProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-[#1A202C] text-sm md:text-base">Strategic Resume Recommendations</h4>
          <p className="text-[11px] text-[#718096] mt-0.5">AI-generated points to upgrade your resume to production-level</p>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="bg-[#F8F9FA] rounded-xl px-4 py-4 border border-[#E2E8F0]">
            <div className="flex items-start justify-between mb-2">
              <h5 className="font-semibold text-[#1A202C] text-sm leading-tight flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#003882]/10 text-[#003882] text-[10px]">
                  {idx + 1}
                </span>
                {rec.title}
              </h5>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium}`}>
                {rec.priority} Priority
              </span>
            </div>
            <p className="text-[13px] text-[#4A5568] leading-relaxed mb-3">
              {rec.recommendation}
            </p>
            <p className="text-[10px] text-[#718096] italic bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-lg inline-block shadow-sm">
              <span className="font-semibold text-[#4A5568] not-italic mr-1">Evidence Source:</span> 
              {rec.evidence_source}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
