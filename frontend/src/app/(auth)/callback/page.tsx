import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

interface CallbackPageProps {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>
}

export default async function CallbackPage({ searchParams }: CallbackPageProps) {
  const params = await searchParams
  const { code, error, error_description } = params

  if (error) {
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
        <div
          style={{
            background: '#0D1530',
            border: '1px solid #FF4444',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '420px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: '#FF4444', marginBottom: '0.75rem' }}>Authentication Failed</h1>
          <p style={{ color: '#8B9BB4' }}>{error_description ?? error}</p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              color: '#00D4FF',
              textDecoration: 'underline',
            }}
          >
            Try again
          </a>
        </div>
      </main>
    )
  }

  if (!code) {
    redirect('/login')
  }

  // Exchange code via API route
  const supabase = await createSupabaseServerClient()
  const { error: authError } = await supabase.auth.exchangeCodeForSession(code)

  if (authError) {
    redirect('/login?error=auth_exchange_failed')
  }

  redirect('/dashboard')
}
