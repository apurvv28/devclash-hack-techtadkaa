import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AuditListItem } from '@/types/audit'
import { cookies } from 'next/headers'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your DevCareer Intelligence dashboard',
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    redirect('/login')
  }

  // Fetch user details to get github_username
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('github_username')
    .eq('id', userId)
    .single()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's audit sessions
  const { data: sessions } = await supabaseAdmin
    .from('audit_sessions')
    .select('*')
    .eq('github_username', user.github_username)
    .order('created_at', { ascending: false })
    .limit(10)

  const auditList = (sessions ?? []) as AuditListItem[]

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0A0F1E',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#E8EDF5' }}>
            Your Audits
          </h1>
          <p style={{ color: '#8B9BB4', marginTop: '0.5rem' }}>
            Manage and review your developer skill audits
          </p>
        </header>

        <a
          id="start-new-audit-btn"
          href="/audit/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#00D4FF',
            color: '#0A0F1E',
            fontWeight: 700,
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            marginBottom: '2rem',
          }}
        >
          + Start New Audit
        </a>

        {auditList.length === 0 ? (
          <div
            style={{
              background: '#0D1530',
              border: '1px solid #1E2D4A',
              borderRadius: '1rem',
              padding: '3rem',
              textAlign: 'center',
              color: '#8B9BB4',
            }}
          >
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No audits yet</p>
            <p style={{ fontSize: '0.875rem' }}>
              Start your first audit to see your verified skill profile.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {auditList.map((audit) => (
              <a
                key={audit.id}
                href={`/audit/${audit.id}`}
                style={{
                  display: 'block',
                  background: '#0D1530',
                  border: '1px solid #1E2D4A',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, color: '#E8EDF5' }}>
                      @{audit.github_username}
                    </p>
                    <p style={{ color: '#8B9BB4', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      {audit.project_count} project{audit.project_count !== 1 ? 's' : ''} ·{' '}
                      {new Date(audit.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background:
                        audit.status === 'complete'
                          ? 'rgba(0,200,150,0.1)'
                          : audit.status === 'failed'
                            ? 'rgba(255,68,68,0.1)'
                            : 'rgba(0,212,255,0.1)',
                      color:
                        audit.status === 'complete'
                          ? '#00C896'
                          : audit.status === 'failed'
                            ? '#FF4444'
                            : '#00D4FF',
                    }}
                  >
                    {audit.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {audit.status !== 'complete' && audit.status !== 'failed' && (
                  <div
                    style={{
                      marginTop: '1rem',
                      background: '#1E2D4A',
                      borderRadius: '9999px',
                      height: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${audit.progress_percent}%`,
                        background: '#00D4FF',
                        borderRadius: '9999px',
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
