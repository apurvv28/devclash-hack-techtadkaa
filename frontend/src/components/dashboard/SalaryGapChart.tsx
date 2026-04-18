'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { SalaryGapSkill } from '@/types/index'

interface SalaryGapChartProps {
  skills: SalaryGapSkill[]
}

function getRoiColor(rank: number, total: number): string {
  const ratio = rank / total
  if (ratio <= 0.33) return '#00C896' // green — highest ROI
  if (ratio <= 0.66) return '#FFB800' // amber — medium ROI
  return '#E2001A' // red — low ROI
}

export function SalaryGapChart({ skills }: SalaryGapChartProps) {
  if (!skills || skills.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center shadow-sm">
        <p className="text-[#718096] text-sm">No salary gap data available</p>
      </div>
    )
  }

  const sorted = [...skills].sort((a, b) => a.career_roi_rank - b.career_roi_rank)
  const total = sorted.length

  const data = sorted.map((skill) => ({
    name: skill.skill,
    frequency: skill.jd_frequency_percent,
    currentLevel: skill.current_level,
    targetLevel: skill.target_level,
    roiRank: skill.career_roi_rank,
    color: getRoiColor(skill.career_roi_rank, total),
  }))

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#1A202C] mb-1">Salary Gap Skills</h3>
      <p className="text-xs text-[#718096] mb-4">Skills by frequency in relevant job descriptions — green = highest ROI</p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#4A5568', fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            height={70}
          />
          <YAxis
            tick={{ fill: '#718096', fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            formatter={(value: any) => {
              return [`${value}%`, 'JD Frequency']
            }}
            labelFormatter={(label) => {
              const item = data.find((d) => d.name === label)
              if (!item) return label
              return `${label} (${item.currentLevel} → ${item.targetLevel})`
            }}
          />
          <Bar dataKey="frequency" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
