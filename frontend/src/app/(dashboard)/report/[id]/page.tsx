import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AuditReport } from '@/types/audit'

interface ReportPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { id } = await params
  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('github_username')
    .eq('id', id)
    .single()

  return {
    title: session ? `${session.github_username} — Audit Report` : 'Audit Report',
    description: 'Detailed developer skill audit report',
  }
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params

  const { data: reportData } = await supabaseAdmin
    .from('audit_reports')
    .select('*')
    .eq('session_id', id)
    .single()

  if (!reportData) {
    const { data: session } = await supabaseAdmin
      .from('audit_sessions')
      .select('status')
      .eq('id', id)
      .single()

    if (!session) notFound()

    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#0A0F1E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', color: '#8B9BB4' }}>
          <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
            Report not yet available
          </p>
          <a href={`/audit/${id}`} style={{ color: '#00D4FF' }}>
            Check audit progress →
          </a>
        </div>
      </main>
    )
  }

  const report = reportData as AuditReport

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0A0F1E',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <nav style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/dashboard" style={{ color: '#8B9BB4', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Dashboard
          </a>
          <a
            id="share-report-btn"
            href={`/api/audit/${id}/share`}
            style={{
              color: '#00D4FF',
              textDecoration: 'none',
              fontSize: '0.875rem',
              border: '1px solid rgba(0,212,255,0.3)',
              padding: '0.375rem 0.875rem',
              borderRadius: '0.5rem',
            }}
          >
            Share Report
          </a>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#E8EDF5' }}>
            @{report.session?.github_username} — Skill Audit Report
          </h1>
          <p style={{ color: '#8B9BB4', marginTop: '0.5rem' }}>
            Generated {new Date(report.generated_at).toLocaleString()} ·{' '}
            {report.repo_analyses?.length ?? 0} repositories analyzed
          </p>
        </div>

        {/* Overall Tier */}
        {report.skill_profile && (
          <div
            style={{
              background: '#0D1530',
              border: '1px solid #1E2D4A',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
            }}
          >
            <div
              style={{
                width: '5rem',
                height: '5rem',
                borderRadius: '50%',
                background: 'rgba(0,212,255,0.1)',
                border: '2px solid #00D4FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.125rem',
                color: '#00D4FF',
                flexShrink: 0,
              }}
            >
              {report.skill_profile.overall_tier}
            </div>
            <div>
              <p style={{ color: '#8B9BB4', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                Overall Verified Tier
              </p>
              <p style={{ color: '#E8EDF5', fontSize: '1.5rem', fontWeight: 700 }}>
                {report.skill_profile.overall_tier}
              </p>
              <p style={{ color: '#8B9BB4', fontSize: '0.875rem' }}>
                Top {100 - report.skill_profile.percentile_estimate}% of developers · {report.skill_profile.commit_archetype} archetype
              </p>
            </div>
          </div>
        )}

        {/* Skill Breakdown */}
        {report.skill_profile && (
          <div
            style={{
              background: '#0D1530',
              border: '1px solid #1E2D4A',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#E8EDF5', marginBottom: '1.5rem' }}>
              Skill Breakdown
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Frontend', tier: report.skill_profile.frontend_tier },
                { label: 'Backend', tier: report.skill_profile.backend_tier },
                { label: 'Security', tier: report.skill_profile.security_tier },
                { label: 'Testing', tier: report.skill_profile.testing_tier },
                { label: 'DB Design', tier: report.skill_profile.db_design_tier },
                { label: 'System Design', tier: report.skill_profile.system_design_tier },
              ].map(({ label, tier }) => (
                <div
                  key={label}
                  style={{
                    background: '#0A0F1E',
                    border: '1px solid #1E2D4A',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                  }}
                >
                  <p style={{ color: '#8B9BB4', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                  <p style={{ color: '#00D4FF', fontWeight: 700, fontSize: '1.125rem' }}>{tier}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flaw Findings */}
        {report.flaw_findings && report.flaw_findings.length > 0 && (
          <div
            style={{
              background: '#0D1530',
              border: '1px solid #1E2D4A',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#E8EDF5', marginBottom: '1.5rem' }}>
              Critical Code Findings
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {report.flaw_findings.slice(0, 10).map((finding, i) => (
                <div
                  key={i}
                  style={{
                    background: '#0A0F1E',
                    border: `1px solid ${finding.severity === 'critical' ? 'rgba(255,68,68,0.3)' : finding.severity === 'high' ? 'rgba(255,184,0,0.3)' : '#1E2D4A'}`,
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: finding.severity === 'critical' ? 'rgba(255,68,68,0.15)' : finding.severity === 'high' ? 'rgba(255,184,0,0.15)' : 'rgba(0,212,255,0.1)',
                        color: finding.severity === 'critical' ? '#FF4444' : finding.severity === 'high' ? '#FFB800' : '#00D4FF',
                      }}
                    >
                      {finding.severity}
                    </span>
                    <code style={{ color: '#8B9BB4', fontSize: '0.75rem' }}>
                      {finding.file}:{finding.line_start}
                    </code>
                  </div>
                  <p style={{ color: '#E8EDF5', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {finding.what_it_is}
                  </p>
                  <p style={{ color: '#8B9BB4', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    {finding.why_it_matters}
                  </p>
                  <p style={{ color: '#00C896', fontSize: '0.875rem' }}>
                    ✦ {finding.what_fixing_unlocks}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
