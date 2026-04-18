import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AuditStatusResponse } from '@/types/audit'
export const dynamic = 'force-dynamic'

interface AuditPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: AuditPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Audit ${id.slice(0, 8)}`,
    description: 'Live audit progress for DevCareer Intelligence',
  }
}

export default async function AuditPage({ params }: AuditPageProps) {
  const { id } = await params

  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (!session) {
    notFound()
  }

  const statusResponse: AuditStatusResponse = {
    session,
    current_stage: session.status,
    eta_seconds: session.status !== 'complete' && session.status !== 'failed'
      ? 120
      : undefined,
  }

  const isComplete = session.status === 'complete'
  const isFailed = session.status === 'failed'
  const isRunning = !isComplete && !isFailed

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0A0F1E',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <nav style={{ marginBottom: '2rem' }}>
          <a href="/dashboard" style={{ color: '#8B9BB4', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back to Dashboard
          </a>
        </nav>

        <div
          style={{
            background: '#0D1530',
            border: `1px solid ${isFailed ? '#FF4444' : isComplete ? '#00C896' : '#1E2D4A'}`,
            borderRadius: '1rem',
            padding: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#E8EDF5' }}>
                Auditing @{session.github_username}
              </h1>
              <p style={{ color: '#8B9BB4', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {session.project_urls?.length ?? 0} repositories · Started{' '}
                {new Date(session.created_at).toLocaleString()}
              </p>
            </div>
            <span
              style={{
                padding: '0.375rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: isFailed
                  ? 'rgba(255,68,68,0.1)'
                  : isComplete
                    ? 'rgba(0,200,150,0.1)'
                    : 'rgba(0,212,255,0.1)',
                color: isFailed ? '#FF4444' : isComplete ? '#00C896' : '#00D4FF',
              }}
            >
              {session.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              background: '#1E2D4A',
              borderRadius: '9999px',
              height: '8px',
              overflow: 'hidden',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${session.progress_percent}%`,
                background: isFailed
                  ? '#FF4444'
                  : isComplete
                    ? 'linear-gradient(90deg, #00C896, #00D4FF)'
                    : 'linear-gradient(90deg, #00D4FF, #00FFEA)',
                borderRadius: '9999px',
                transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isRunning ? '0 0 12px rgba(0,212,255,0.5)' : 'none',
              }}
            />
          </div>
          <p style={{ color: '#8B9BB4', fontSize: '0.875rem', marginBottom: '2rem' }}>
            {session.progress_percent}% complete
            {statusResponse.eta_seconds && ` · ~${Math.round(statusResponse.eta_seconds / 60)} min remaining`}
          </p>

          {/* Stage indicators */}
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { key: 'fetching_github', label: 'Fetching GitHub data' },
              { key: 'analyzing_code', label: 'Analyzing code quality & complexity' },
              { key: 'auditing_live', label: 'Live site audit (Lighthouse)' },
              { key: 'synthesizing_ai', label: 'AI synthesis & skill profiling' },
              { key: 'fetching_market', label: 'Job market matching' },
              { key: 'complete', label: 'Report ready' },
            ].map((stage) => {
              const stages = ['fetching_github', 'analyzing_code', 'auditing_live', 'synthesizing_ai', 'fetching_market', 'complete']
              const currentIdx = stages.indexOf(session.status)
              const stageIdx = stages.indexOf(stage.key)
              const isDone = stageIdx < currentIdx || session.status === 'complete'
              const isCurrent = stage.key === session.status

              return (
                <div
                  key={stage.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: isCurrent ? 'rgba(0,212,255,0.05)' : 'transparent',
                    border: isCurrent ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
                    borderRadius: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>
                    {isDone ? '✅' : isCurrent ? '⏳' : '○'}
                  </span>
                  <span
                    style={{
                      color: isDone ? '#00C896' : isCurrent ? '#00D4FF' : '#4A5568',
                      fontSize: '0.875rem',
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>

          {isComplete && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <a
                id="view-report-btn"
                href={`/report/${id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#00C896',
                  color: '#0A0F1E',
                  fontWeight: 700,
                  padding: '0.875rem 2rem',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                }}
              >
                View Full Report →
              </a>
            </div>
          )}

          {isFailed && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <a
                href={`/api/audit/${id}/resume`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#FFB800',
                  color: '#0A0F1E',
                  fontWeight: 700,
                  padding: '0.875rem 2rem',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                }}
              >
                Resume Audit
              </a>
            </div>
          )}
        </div>

        {isRunning && (
          <>
            <p
              style={{
                textAlign: 'center',
                color: '#4A5568',
                fontSize: '0.75rem',
                marginTop: '1.5rem',
              }}
            >
              This page auto-refreshes. You can also close it and come back later.
            </p>
            <meta httpEquiv="refresh" content="3" />
          </>
        )}
      </div>
    </main>
  )
}
