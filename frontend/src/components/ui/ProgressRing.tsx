'use client'

import React, { useEffect, useState } from 'react'

interface ProgressRingProps {
  percent: number
  size?: number
  strokeWidth?: number
  color?: string
}

export function ProgressRing({
  percent,
  size = 200,
  strokeWidth = 12,
  color = '#003882',
}: ProgressRingProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0)

  useEffect(() => {
    setAnimatedPercent(percent)
  }, [percent])

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (animatedPercent / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-in-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-bold tracking-tighter" style={{ color }}>
          {animatedPercent}%
        </span>
      </div>
    </div>
  )
}
