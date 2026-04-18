'use client'

import React from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { CareerTier } from '@/types/index'

interface SkillRadarChartProps {
  skills: {
    frontend_tier: CareerTier
    backend_tier: CareerTier
    devops_tier: CareerTier
    security_tier: CareerTier
    testing_tier: CareerTier
    db_design_tier: CareerTier
    system_design_tier: CareerTier
    overall_tier: CareerTier
  }
}

const TIER_SCORES: Record<CareerTier, number> = {
  Beginner: 1,
  Junior: 2,
  'Junior+': 3,
  Mid: 4,
  'Mid+': 5,
  Senior: 6,
  Staff: 7,
}

const TIER_BENCHMARKS: Record<CareerTier, Record<string, number>> = {
  Beginner: { Frontend: 1, Backend: 1, DevOps: 1, Security: 1, Testing: 1, 'DB Design': 1, 'System Design': 1 },
  Junior: { Frontend: 2, Backend: 2, DevOps: 1, Security: 1, Testing: 2, 'DB Design': 1, 'System Design': 1 },
  'Junior+': { Frontend: 3, Backend: 3, DevOps: 2, Security: 2, Testing: 2, 'DB Design': 2, 'System Design': 2 },
  Mid: { Frontend: 4, Backend: 4, DevOps: 3, Security: 3, Testing: 3, 'DB Design': 3, 'System Design': 3 },
  'Mid+': { Frontend: 5, Backend: 5, DevOps: 4, Security: 4, Testing: 4, 'DB Design': 4, 'System Design': 4 },
  Senior: { Frontend: 6, Backend: 6, DevOps: 5, Security: 5, Testing: 5, 'DB Design': 5, 'System Design': 5 },
  Staff: { Frontend: 7, Backend: 7, DevOps: 6, Security: 6, Testing: 6, 'DB Design': 6, 'System Design': 6 },
}

const DIMENSION_LABELS: { key: string; label: string }[] = [
  { key: 'frontend_tier', label: 'Frontend' },
  { key: 'backend_tier', label: 'Backend' },
  { key: 'devops_tier', label: 'DevOps' },
  { key: 'security_tier', label: 'Security' },
  { key: 'testing_tier', label: 'Testing' },
  { key: 'db_design_tier', label: 'DB Design' },
  { key: 'system_design_tier', label: 'System Design' },
]

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  const benchmark = TIER_BENCHMARKS[skills.overall_tier]

  const data = DIMENSION_LABELS.map(({ key, label }) => ({
    dimension: label,
    score: TIER_SCORES[(skills as any)[key] as CareerTier] || 0,
    benchmark: benchmark[label] || 0,
  }))

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#1A202C] mb-4">Skill Dimensions</h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#4A5568', fontSize: 12, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            domain={[0, 7]}
            tick={{ fill: '#718096', fontSize: 10 }}
            tickCount={8}
            axisLine={false}
          />
          <Radar
            name="Tier Benchmark"
            dataKey="benchmark"
            stroke="#FFB800"
            fill="#FFB800"
            fillOpacity={0.15}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          <Radar
            name="Your Skills"
            dataKey="score"
            stroke="#003882"
            fill="#003882"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#4A5568' }}
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
              const tiers = Object.entries(TIER_SCORES)
              const match = tiers.find(([, s]) => s === Number(value))
              return match ? match[0] : value
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
