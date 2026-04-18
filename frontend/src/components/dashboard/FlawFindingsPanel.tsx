'use client'

import React, { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import type { AuditFlawFinding } from '@/types/index'

interface FlawFindingsPanelProps {
  findings: AuditFlawFinding[]
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  critical: {
    border: 'border-l-[#E2001A]',
    bg: 'bg-red-50',
    text: 'text-[#E2001A]',
    badge: 'bg-red-100 text-[#E2001A] border-red-200',
  },
  high: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  medium: {
    border: 'border-l-yellow-400',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
}

export function FlawFindingsPanel({ findings }: FlawFindingsPanelProps) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  const displayFindings = showAll ? findings : findings.slice(0, 5)

  if (findings.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center shadow-sm">
        <div className="text-emerald-500 text-4xl mb-3">✓</div>
        <p className="text-[#1A202C] font-semibold text-lg">No Critical Findings</p>
        <p className="text-[#718096] text-sm mt-1">Your code passed all automated quality checks</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-[#1A202C]">
          Code Findings
          <span className="text-sm font-normal text-[#718096] ml-2">({findings.length})</span>
        </h3>
      </div>

      {displayFindings.map((finding, idx) => {
        const style = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.medium
        const isExpanded = expanded === idx

        return (
          <div
            key={idx}
            className={`bg-white border border-[#E2E8F0] ${style.border} border-l-4 rounded-xl overflow-hidden shadow-sm transition-all duration-200`}
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : idx)}
              className="w-full text-left px-5 py-4 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${style.badge}`}>
                    {finding.severity}
                  </span>
                  {finding.career_impact && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider bg-[#003882]/10 text-[#003882] border border-[#003882]/20">
                      {finding.career_impact}
                    </span>
                  )}
                </div>
                <p className="text-[#1A202C] font-semibold text-sm leading-snug">{finding.what_it_is}</p>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#718096] flex-shrink-0 mt-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#718096] flex-shrink-0 mt-1" />
              )}
            </button>

            {isExpanded && (
              <div className="px-5 pb-4 space-y-3 border-t border-[#E2E8F0]">
                <div className="pt-3">
                  {finding.github_permalink ? (
                    <a
                      href={finding.github_permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#003882] text-xs font-mono hover:underline"
                    >
                      {finding.file}:{finding.line_start}–{finding.line_end}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs font-mono text-[#718096]">
                      {finding.file}:{finding.line_start}–{finding.line_end}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#4A5568] leading-relaxed">{finding.why_it_matters}</p>
                <div className="flex items-start gap-2 bg-[#F0F7FF] rounded-lg px-4 py-3 border border-[#003882]/10">
                  <span className="text-[#003882] font-bold text-sm">→</span>
                  <p className="text-sm text-[#003882] font-medium">{finding.what_fixing_unlocks}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {findings.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-sm text-[#003882] font-medium py-2 hover:bg-blue-50 rounded-lg transition"
        >
          {showAll ? 'Show Less' : `Show All ${findings.length} Findings`}
        </button>
      )}
    </div>
  )
}
