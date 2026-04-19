'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Globe, Monitor, Smartphone, Tablet, ExternalLink, Play, Loader2, CheckCircle2,
  AlertTriangle, Zap, Eye, Shield, MousePointerClick, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react'

interface UiUxTestPanelProps {
  session: {
    id: string
    deployment_url?: string
    ui_ux_score?: number
    ui_ux_skipped?: boolean
  }
  initialResult?: any
  isPublicShare?: boolean
}

interface TestResult {
  overall_score: number
  responsiveness: { score: number; max: number; details: any[] }
  console_errors: { score: number; max: number; errors: string[]; count: number }
  performance: { score: number; max: number; page_load_ms: number }
  accessibility: { score: number; max: number; issues: string[] }
  interactivity: { score: number; max: number; found: number; clicked: number; working: number }
  video_url: string | null
}

interface LogEntry {
  id: number
  message: string
  timestamp: string
  step: string
}

export function UiUxTestPanel({ session, initialResult, isPublicShare = false }: UiUxTestPanelProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [result, setResult] = useState<TestResult | null>(initialResult || null)
  const [error, setError] = useState<string | null>(null)
  const [showVideo, setShowVideo] = useState(true)
  const [showDetails, setShowDetails] = useState(true)
  const logContainerRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((step: string, message: string) => {
    setLogs((prev) => {
      const newLogs = [...prev, { id: Date.now() + Math.random(), message, timestamp: new Date().toLocaleTimeString(), step }]
      return newLogs.slice(-12)
    })
    // Auto-scroll
    setTimeout(() => {
      logContainerRef.current?.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }, [])

  const runTest = useCallback(async () => {
    if (!session.deployment_url) return

    setIsRunning(true)
    setProgress(0)
    setLogs([])
    setResult(null)
    setError(null)

    try {
      const res = await fetch(`/api/audit/${session.id}/uiux-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deployment_url: session.deployment_url }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.progress !== undefined) setProgress(data.progress)
            if (data.message) addLog(data.step || '', data.message)

            if (data.step === 'complete' && data.result) {
              setResult(data.result)
            }

            if (data.step === 'error') {
              setError(data.message)
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRunning(false)
    }
  }, [session.id, session.deployment_url, addLog])

  // ─── Fallback: No URL was provided ───
  if (session.ui_ux_skipped && !session.deployment_url) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
            <Globe className="w-6 h-6 text-[#718096]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#1A202C] mb-1">UI/UX Testing Skipped</h3>
            <p className="text-[#718096] text-sm leading-relaxed">
              No deployment URL was provided during the audit submission. To enable automated
              Playwright UI/UX testing, please re-run the audit with a valid live deployment URL.
            </p>
            <div className="mt-4 p-3 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0]">
              <p className="text-xs text-[#4A5568] font-medium">
                💡 Add your deployed URL (e.g. <code className="bg-white px-1.5 py-0.5 rounded text-[#003882] border border-[#E2E8F0]">https://my-app.vercel.app</code>)
                in the audit form to get a full UI/UX score breakdown.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const displayScore = result?.overall_score ?? session.ui_ux_score ?? 0
  const hasResult = result !== null || (session.ui_ux_score !== undefined && session.ui_ux_score > 0)

  return (
    <div className="space-y-5">
      {/* Header Card with Run Button */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#00A1E4]/10 to-[#003882]/10 rounded-xl border border-[#003882]/10">
              <Globe className="w-5 h-5 text-[#003882]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#1A202C]">UI/UX Analysis</h3>
              <p className="text-xs text-[#718096]">Automated Playwright testing engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session.deployment_url && (
              <a
                href={session.deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#718096] hover:text-[#003882] font-medium transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Live Demo
              </a>
            )}
            {!isPublicShare && (
              <button
                onClick={runTest}
                disabled={isRunning || !session.deployment_url}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00A1E4] to-[#003882] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:from-[#003882] hover:to-[#00A1E4] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Run UI/UX Test
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* URL display */}
        {session.deployment_url && (
          <div className="bg-[#F8F9FA] rounded-xl px-4 py-2.5 border border-[#E2E8F0] mb-5">
            <p className="text-xs text-[#718096] font-mono truncate">{session.deployment_url}</p>
          </div>
        )}

        {/* score display if we have results */}
        {hasResult && !isRunning && (
          <ScoreDisplay score={displayScore} result={result} />
        )}
      </div>

      {/* Live Testing Terminal (shown while running OR after completion) */}
      {(isRunning || logs.length > 0) && (
        <div className="bg-[#0F1419] rounded-2xl overflow-hidden shadow-lg border border-[#2D3748]">
          {/* Terminal header */}
          <div className="bg-[#1A202C] px-5 py-3 flex items-center justify-between border-b border-[#2D3748]">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FC8181]" />
                <div className="w-3 h-3 rounded-full bg-[#F6E05E]" />
                <div className="w-3 h-3 rounded-full bg-[#68D391]" />
              </div>
              <span className="text-[#A0AEC0] text-xs font-mono">playwright-uiux-tester</span>
            </div>
            <div className="flex items-center gap-2">
              {isRunning && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
              {!isRunning && logs.length > 0 && (
                <span className="text-[#718096] text-xs font-mono">COMPLETED</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isRunning && (
            <div className="h-1 bg-[#1A202C]">
              <div
                className="h-full bg-gradient-to-r from-[#00A1E4] to-[#003882] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Log lines */}
          <div
            ref={logContainerRef}
            className="p-5 space-y-1.5 max-h-72 overflow-y-auto font-mono text-sm scrollbar-thin"
          >
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
                <span className="text-[#4A5568] text-xs whitespace-nowrap">[{log.timestamp}]</span>
                {log.step === 'error' ? (
                  <span className="text-[#FC8181]">✗ {log.message}</span>
                ) : log.step === 'complete' ? (
                  <span className="text-[#68D391]">✓ {log.message}</span>
                ) : (
                  <span className="text-[#E2E8F0]">
                    <span className="text-[#00A1E4]">►</span> {log.message}
                  </span>
                )}
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 text-[#A0AEC0] animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs">Processing...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Player */}
      {!isPublicShare && result?.video_url && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setShowVideo(!showVideo)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F8F9FA] transition"
          >
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-[#003882]" />
              <span className="text-sm font-semibold text-[#1A202C]">Test Recording</span>
              <span className="text-[10px] text-[#003882] bg-blue-50 border border-[#003882]/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Video
              </span>
            </div>
            {showVideo ? <ChevronUp className="w-4 h-4 text-[#718096]" /> : <ChevronDown className="w-4 h-4 text-[#718096]" />}
          </button>

          {showVideo && (
            <div className="border-t border-[#E2E8F0] p-3 bg-[#F0F4F8]">
              <video
                src={result.video_url}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="w-full rounded-xl shadow-md"
                style={{ maxHeight: '500px' }}
              />
              <p className="text-[11px] text-[#718096] mt-2 px-2">
                This video was recorded by the Playwright engine during automated UI/UX testing of your deployment.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Detailed Scores Breakdown */}
      {result && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F8F9FA] transition"
          >
            <span className="text-sm font-semibold text-[#1A202C]">Detailed Score Breakdown</span>
            {showDetails ? <ChevronUp className="w-4 h-4 text-[#718096]" /> : <ChevronDown className="w-4 h-4 text-[#718096]" />}
          </button>

          {showDetails && (
            <div className="border-t border-[#E2E8F0] p-6 space-y-5">
              {/* Responsiveness */}
              <ScoreCategory
                icon={<Monitor className="w-4 h-4" />}
                label="Responsiveness"
                score={result.responsiveness.score}
                max={result.responsiveness.max}
                color="blue"
              >
                <div className="space-y-1.5">
                  {result.responsiveness.details.map((vp: any) => (
                    <div key={vp.name} className="flex items-center justify-between text-xs">
                      <span className="text-[#4A5568]">{vp.name} ({vp.width}×{vp.height})</span>
                      <div className="flex items-center gap-2">
                        {vp.has_horizontal_scroll && <span className="text-amber-500">Horizontal scroll</span>}
                        {vp.has_text_overflow && <span className="text-amber-500">Text overflow</span>}
                        {!vp.has_horizontal_scroll && !vp.has_text_overflow && <span className="text-emerald-600">✓ Pass</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScoreCategory>

              {/* Performance */}
              <ScoreCategory
                icon={<Zap className="w-4 h-4" />}
                label="Performance"
                score={result.performance.score}
                max={result.performance.max}
                color="yellow"
              >
                <p className="text-xs text-[#4A5568]">
                  Page Load Time: <span className="font-bold text-[#1A202C]">{(result.performance.page_load_ms / 1000).toFixed(2)}s</span>
                  {result.performance.page_load_ms < 1500 && <span className="text-emerald-600 ml-2">✓ Fast</span>}
                  {result.performance.page_load_ms >= 3000 && <span className="text-amber-500 ml-2">⚠ Slow</span>}
                </p>
              </ScoreCategory>

              {/* Accessibility */}
              <ScoreCategory
                icon={<Shield className="w-4 h-4" />}
                label="Accessibility"
                score={result.accessibility.score}
                max={result.accessibility.max}
                color="purple"
              >
                {result.accessibility.issues.length === 0 ? (
                  <p className="text-xs text-emerald-600">✓ No accessibility issues found</p>
                ) : (
                  <ul className="space-y-1">
                    {result.accessibility.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-[#4A5568] flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}
              </ScoreCategory>

              {/* Interactivity */}
              <ScoreCategory
                icon={<MousePointerClick className="w-4 h-4" />}
                label="Interactive Elements"
                score={result.interactivity.score}
                max={result.interactivity.max}
                color="green"
              >
                <p className="text-xs text-[#4A5568]">
                  Found {result.interactivity.found} clickable elements · Tested {result.interactivity.clicked} · {result.interactivity.working} responded correctly
                </p>
              </ScoreCategory>

              {/* Console Errors */}
              <ScoreCategory
                icon={<XCircle className="w-4 h-4" />}
                label="Console Errors"
                score={result.console_errors.score}
                max={result.console_errors.max}
                color="red"
              >
                {result.console_errors.count === 0 ? (
                  <p className="text-xs text-emerald-600">✓ No console errors detected</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-[#E2001A] font-medium">{result.console_errors.count} error(s) detected</p>
                    {result.console_errors.errors.map((err, i) => (
                      <p key={i} className="text-xs text-[#718096] font-mono bg-[#F8F9FA] px-2 py-1 rounded truncate">{err}</p>
                    ))}
                  </div>
                )}
              </ScoreCategory>
            </div>
          )}
        </div>
      )}

      {/* iframe preview */}
      {session.deployment_url && !isRunning && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-[#003882]" />
              <span className="text-sm font-semibold text-[#1A202C]">Live Preview</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Live</span>
            </div>
          </div>
          <div className="p-2 bg-[#F0F4F8]">
            <div className="bg-white rounded-t-lg border border-[#E2E8F0] px-4 py-2 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FC8181]" />
                <div className="w-3 h-3 rounded-full bg-[#F6E05E]" />
                <div className="w-3 h-3 rounded-full bg-[#68D391]" />
              </div>
              <div className="flex-1 bg-[#F8F9FA] rounded-md px-3 py-1 text-xs text-[#718096] font-mono truncate border border-[#E2E8F0]">
                {session.deployment_url}
              </div>
            </div>
            <iframe
              src={session.deployment_url}
              title="Deployment Preview"
              className="w-full h-[420px] border border-[#E2E8F0] border-t-0 rounded-b-lg bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {error && !isRunning && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-[#E2001A] flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#E2001A]">Test Failed</p>
            <p className="text-xs text-[#718096] mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───

function ScoreDisplay({ score, result }: { score: number; result: TestResult | null }) {
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-[#E2001A]'
  const scoreBg = score >= 80 ? 'bg-emerald-50 border-emerald-200' : score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  const scoreLabel = score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : score >= 60 ? 'Needs Work' : score >= 40 ? 'Poor' : 'Critical'
  const gradientColor = score >= 80 ? 'from-emerald-400 to-emerald-500' : score >= 50 ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'

  return (
    <div className="flex items-center gap-6">
      <div className={`flex flex-col items-center justify-center w-28 h-28 rounded-2xl border-2 ${scoreBg}`}>
        <span className={`text-4xl font-extrabold ${scoreColor}`}>{score}</span>
        <span className="text-[10px] text-[#718096] font-medium">/100</span>
      </div>
      <div className="flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</span>
          <span className="text-[10px] text-[#718096] uppercase tracking-wider font-bold">UI/UX Score</span>
        </div>
        <div className="w-full h-2.5 bg-[#F0F4F8] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${gradientColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
        {result && (
          <div className="grid grid-cols-5 gap-2 pt-1">
            <MiniScore icon={<Monitor className="w-3 h-3" />} label="Responsive" score={result.responsiveness.score} max={result.responsiveness.max} />
            <MiniScore icon={<Zap className="w-3 h-3" />} label="Perf" score={result.performance.score} max={result.performance.max} />
            <MiniScore icon={<Shield className="w-3 h-3" />} label="A11y" score={result.accessibility.score} max={result.accessibility.max} />
            <MiniScore icon={<MousePointerClick className="w-3 h-3" />} label="Interactive" score={result.interactivity.score} max={result.interactivity.max} />
            <MiniScore icon={<XCircle className="w-3 h-3" />} label="Errors" score={result.console_errors.score} max={result.console_errors.max} />
          </div>
        )}
      </div>
    </div>
  )
}

function MiniScore({ icon, label, score, max }: { icon: React.ReactNode; label: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100)
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-[#E2001A]'
  return (
    <div className="text-center">
      <div className="flex justify-center text-[#003882] mb-0.5">{icon}</div>
      <p className={`text-xs font-bold ${color}`}>{score}/{max}</p>
      <p className="text-[9px] text-[#718096]">{label}</p>
    </div>
  )
}

function ScoreCategory({
  icon, label, score, max, color, children,
}: {
  icon: React.ReactNode; label: string; score: number; max: number; color: string; children: React.ReactNode
}) {
  const pct = Math.round((score / max) * 100)
  const textColor = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-[#E2001A]'
  const barColor = pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'

  return (
    <div className="p-4 bg-[#FAFBFC] rounded-xl border border-[#E2E8F0]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[#003882]">
          {icon}
          <span className="text-sm font-semibold text-[#1A202C]">{label}</span>
        </div>
        <span className={`text-sm font-bold ${textColor}`}>{score}/{max}</span>
      </div>
      <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {children}
    </div>
  )
}
