'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoRefresh({ intervalMs = 2000, isActive = true }: { intervalMs?: number, isActive?: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      router.refresh()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [router, intervalMs, isActive])

  return null
}
