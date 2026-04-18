'use client'

import React, { useState } from 'react'
import { BookOpen, Play, Code, Dumbbell, ExternalLink, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import type { WeekPlan, RoadmapTask } from '@/types/index'

interface RoadmapViewProps {
  weeks: WeekPlan[]
  prioritySkills: string[]
}

const resourceIcons: Record<string, React.ElementType> = {
  docs: BookOpen,
  video: Play,
  project: Code,
  practice: Dumbbell,
}

function TaskItem({ task }: { task: RoadmapTask }) {
  const Icon = resourceIcons[task.resource_type] || BookOpen

  return (
    <div className="flex items-start gap-3 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg px-4 py-3">
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-1.5 mt-0.5 flex-shrink-0">
        <Icon className="w-4 h-4 text-[#003882]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A202C] leading-snug">{task.title}</p>
        <p className="text-xs text-[#718096] mt-0.5 leading-relaxed">{task.description}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-[#718096] bg-white border border-[#E2E8F0] rounded-md px-2 py-0.5 font-medium">
            <Clock className="w-3 h-3" />
            {task.estimated_hours}h
          </span>
          {task.resource_url && (
            <a
              href={task.resource_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-[#003882] font-medium hover:underline"
            >
              Open resource <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function WeekNode({ week, isLast }: { week: WeekPlan; isLast: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative flex gap-4">
      {/* Timeline line + node */}
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A1E4] to-[#003882] text-white text-sm font-bold flex items-center justify-center shadow-md z-10">
          {week.week}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-[#00A1E4]/40 to-[#E2E8F0] mt-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <button
          onClick={() => setOpen(!open)}
          className="w-full text-left flex items-center justify-between bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div>
            <p className="font-semibold text-[#1A202C]">{week.title}</p>
            <p className="text-xs text-[#718096] mt-0.5">{week.tasks.length} tasks</p>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-[#718096]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#718096]" />
          )}
        </button>

        {open && (
          <div className="mt-3 space-y-2">
            {week.tasks.map((task, tidx) => (
              <TaskItem key={tidx} task={task} />
            ))}
          </div>
        )}

        {/* Milestone */}
        {week.milestone && (
          <p className="text-xs text-emerald-600 font-medium italic mt-3 pl-1">
            🏁 {week.milestone}
          </p>
        )}
      </div>
    </div>
  )
}

export function RoadmapView({ weeks, prioritySkills }: RoadmapViewProps) {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center shadow-sm">
        <p className="text-[#718096] text-sm">No roadmap data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[#1A202C]">Growth Roadmap</h3>
        {prioritySkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {prioritySkills.map((skill) => (
              <span
                key={skill}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#003882]/10 text-[#003882] border border-[#003882]/20 font-semibold uppercase tracking-wider"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-[600px] overflow-y-auto pr-1">
        {weeks.map((week, idx) => (
          <WeekNode key={week.week} week={week} isLast={idx === weeks.length - 1} />
        ))}
      </div>
    </div>
  )
}
