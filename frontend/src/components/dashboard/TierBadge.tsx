'use client'

import React from 'react'
import { Trophy, TrendingUp, User } from 'lucide-react'
import type { CareerTier } from '@/types/index'

interface TierBadgeProps {
  tier: CareerTier
  percentile: number
  archetype: string
  ceilingApplied: boolean
  tutorialPenaltyApplied: boolean
}

const TIER_CONFIG: Record<CareerTier, { bg: string; text: string; border: string }> = {
  Beginner: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  Junior: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Junior+': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  Mid: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Mid+': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  Senior: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  Staff: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-400' },
}

function TierIcon({ tier }: { tier: CareerTier }) {
  if (tier === 'Senior' || tier === 'Staff') return <Trophy className="w-6 h-6" />
  if (tier === 'Mid' || tier === 'Mid+') return <TrendingUp className="w-6 h-6" />
  return <User className="w-6 h-6" />
}

export function TierBadge({ tier, percentile, archetype, ceilingApplied, tutorialPenaltyApplied }: TierBadgeProps) {
  const config = TIER_CONFIG[tier]

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
      {/* Main tier badge */}
      <div className="flex items-center gap-4">
        <div className={`${config.bg} ${config.text} ${config.border} border-2 w-16 h-16 rounded-2xl flex items-center justify-center`}>
          <TierIcon tier={tier} />
        </div>
        <div>
          <p className="text-sm text-[#718096] font-medium">Verified Overall Tier</p>
          <p className={`text-2xl font-bold ${config.text}`}>{tier}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F8F9FA] rounded-xl px-4 py-3 border border-[#E2E8F0]">
          <p className="text-xs text-[#718096] uppercase tracking-wider font-medium">Percentile</p>
          <p className="text-lg font-bold text-[#003882]">Top {100 - percentile}%</p>
        </div>
        <div className="bg-[#F8F9FA] rounded-xl px-4 py-3 border border-[#E2E8F0]">
          <p className="text-xs text-[#718096] uppercase tracking-wider font-medium">Archetype</p>
          <p className="text-lg font-bold text-[#1A202C]">{archetype}</p>
        </div>
      </div>

      {/* Warnings */}
      {ceilingApplied && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-amber-500 text-sm mt-0.5">⚠</span>
          <p className="text-xs text-amber-700 font-medium">
            Complexity ceiling applied — build more complex projects to unlock higher tiers
          </p>
        </div>
      )}
      {tutorialPenaltyApplied && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-[#E2001A] text-sm mt-0.5">⚠</span>
          <p className="text-xs text-[#E2001A] font-medium">
            Tutorial clone penalty applied — original projects score higher
          </p>
        </div>
      )}
    </div>
  )
}
