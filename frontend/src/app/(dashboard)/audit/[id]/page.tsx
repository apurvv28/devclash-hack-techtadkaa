'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react'
import { ProgressRing } from '@/components/ui/ProgressRing'

interface LogMessage {
  id: number
  text: string
  timestamp: string
}

const STAGES = [
  { id: 'queued', label: 'Queued for Analysis' },
  { id: 'fetching_github', label: 'Fetching GitHub Repositories' },
  { id: 'analyzing_code', label: 'AST Code Validation & Security Scan' },
  { id: 'auditing_live', label: 'Live Playwright & Lighthouse Audit' },
  { id: 'synthesizing_ai', label: 'Groq/Gemini Architecture Synthesis' },
  { id: 'fetching_market', label: 'Jooble & Remotive Salary Evaluation' },
]

export default function LiveAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const id = unwrappedParams.id
  const router = useRouter()

  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('queued')
  const [logs, setLogs] = useState<LogMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // ETA calculation
  const [startTime] = useState(Date.now())
  const [eta, setEta] = useState<string>('Calculating...')

  useEffect(() => {
    if (progress > 0 && progress < 100) {
      const elapsed = Date.now() - startTime
      const estimatedTotal = (elapsed / progress) * 100
      const remainingMs = Math.max(0, estimatedTotal - elapsed)
      const remainingSecs = Math.ceil(remainingMs / 1000)
      if (remainingSecs > 60) {
        setEta(`${Math.floor(remainingSecs / 60)}m ${remainingSecs % 60}s remaining`)
      } else {
        setEta(`${remainingSecs}s remaining`)
      }
    } else if (progress === 100) {
      setEta('Complete!')
    }
  }, [progress, startTime])

  useEffect(() => {
    const eventSource = new EventSource(`/api/audit/${id}/stream`)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'error') {
          setError(data.error)
          setStatus('failed')
          eventSource.close()
          return
        }

        if (data.progress_percent !== undefined) {
          setProgress(data.progress_percent)
        }
        
        if (data.stage) {
          setStatus(data.stage)
        }
        
        if (data.message || data.stage) {
           const text = data.message || `Switched to stage: ${data.stage}`
           setLogs(prev => {
             const newLogs = [...prev, { id: Date.now(), text, timestamp: new Date().toLocaleTimeString() }]
             return newLogs.slice(-5) // Keep last 5
           })
        }

        if (data.type === 'complete' || data.stage === 'complete' || data.progress_percent === 100) {
          eventSource.close()
          router.push(`/report/${id}`)
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err)
      setError('Connection to intelligence stream lost.')
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [id, router])

  const getCurrentStageIndex = () => {
    return STAGES.findIndex(s => s.id === status)
  }
  const currentStageIndex = getCurrentStageIndex()

  if (error || status === 'failed') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-8">
        <div className="bg-white border border-red-200 p-8 rounded-2xl max-w-lg w-full text-center space-y-4 shadow-md">
          <AlertCircle className="w-16 h-16 text-[#E2001A] mx-auto" />
          <h2 className="text-2xl font-bold text-[#E2001A]">Audit Pipeline Failed</h2>
          <p className="text-[#4A5568]">{error || 'An unexpected error occurred during the audit.'}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="mt-6 bg-[#003882] hover:bg-[#002B66] text-white px-6 py-2 rounded-lg transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] p-8">
      <div className="max-w-4xl mx-auto space-y-12 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1A202C]">Active Audit Pipeline</h1>
          <p className="text-[#4A5568] text-lg">Real-time architecture and market intelligence extraction.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-white border border-[#E2E8F0] p-8 rounded-3xl shadow-lg">
          <div className="flex flex-col items-center justify-center space-y-6">
            <ProgressRing percent={progress} size={280} strokeWidth={16} color="#003882" />
            <div className="text-center">
              <h2 className="text-3xl font-bold text-[#003882] capitalize drop-shadow-sm">
                {status.replace('_', ' ')}
              </h2>
              <p className="text-[#718096] mt-2 font-mono">{eta}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-[#1A202C] border-b border-[#E2E8F0] pb-2">Execution Stages</h3>
            <div className="space-y-4">
              {STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex || status === 'complete'
                const isCurrent = idx === currentStageIndex && status !== 'complete'
                const isPending = idx > currentStageIndex && status !== 'complete'

                return (
                  <div key={stage.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {isCompleted && <CheckCircle2 className="w-7 h-7 text-emerald-500" />}
                      {isCurrent && <Loader2 className="w-7 h-7 text-[#00A1E4] animate-spin" />}
                      {isPending && <Circle className="w-7 h-7 text-[#CBD5E0]" />}
                    </div>
                    <div>
                      <p className={`font-medium text-lg ${
                        isCompleted ? 'text-[#1A202C]' : 
                        isCurrent ? 'text-[#003882] drop-shadow-sm' : 
                        'text-[#CBD5E0]'
                      }`}>
                        {stage.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden font-mono text-sm max-w-4xl mx-auto shadow-sm">
          <div className="bg-[#F8F9FA] px-4 py-2 border-b border-[#E2E8F0] flex justify-between">
            <span className="text-[#4A5568]">Live Process Logs</span>
            <span className="text-emerald-500 animate-pulse">● Live</span>
          </div>
          <div className="p-4 space-y-2 max-h-48 overflow-hidden min-h-[120px]">
            {logs.length === 0 ? (
              <p className="text-[#CBD5E0] italic">Waiting for orchestrator streams...</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="text-[#1A202C] animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <span className="text-[#003882] mr-3">[{log.timestamp}]</span>
                  {log.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
