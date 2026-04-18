'use client'

import React, { useState } from 'react'
import { ExternalLink, MapPin, Wifi } from 'lucide-react'
import type { JobMatch } from '@/types/index'

interface MarketFitPanelProps {
  qualifyNow: JobMatch[]
  qualify90d: JobMatch[]
  qualify6mo: JobMatch[]
}

type TabKey = 'now' | '90d' | '6mo'

function MatchProgressBar({ percent }: { percent: number }) {
  const color =
    percent >= 80 ? 'bg-emerald-500' :
    percent >= 60 ? 'bg-[#00A1E4]' :
    percent >= 40 ? 'bg-amber-400' :
    'bg-[#E2001A]'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[#E9ECEF] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-sm font-bold text-[#1A202C] w-12 text-right">{percent}%</span>
    </div>
  )
}

function JobCard({ job }: { job: JobMatch }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[#003882] font-semibold text-sm">{job.company}</p>
          <p className="text-[#1A202C] font-bold text-base mt-0.5 leading-snug">{job.title}</p>
        </div>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 ml-3 bg-[#003882] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#002B66] transition inline-flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-[#718096] mb-3">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {job.location || 'Not specified'}
        </span>
        {job.salary_range && (
          <span className="text-emerald-600 font-medium">{job.salary_range}</span>
        )}
      </div>

      <MatchProgressBar percent={job.match_percent} />

      {job.missing_skills && job.missing_skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.missing_skills.map((skill) => (
            <span
              key={skill}
              className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-[#E2001A] border border-red-200 font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function MarketFitPanel({ qualifyNow, qualify90d, qualify6mo }: MarketFitPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('now')

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'now', label: 'Qualify Now', count: qualifyNow.length },
    { key: '90d', label: '90 Days', count: qualify90d.length },
    { key: '6mo', label: '6 Months', count: qualify6mo.length },
  ]

  const activeJobs = activeTab === 'now' ? qualifyNow :
                     activeTab === '90d' ? qualify90d :
                     qualify6mo

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1A202C]">Market Fit</h3>

      {/* Tab bar */}
      <div className="flex bg-[#F0F4F8] rounded-xl p-1 border border-[#E2E8F0]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-sm font-medium py-2.5 px-4 rounded-lg transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white text-[#003882] shadow-sm border border-[#E2E8F0]'
                : 'text-[#718096] hover:text-[#4A5568]'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-[#00A1E4]' : 'text-[#CBD5E0]'}`}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Job cards */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {activeJobs.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center shadow-sm">
            <p className="text-[#718096] text-sm">No matching roles found for this timeline</p>
          </div>
        ) : (
          activeJobs.map((job, idx) => <JobCard key={idx} job={job} />)
        )}
      </div>
    </div>
  )
}
