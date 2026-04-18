import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to DevCareer Intelligence with your GitHub account',
}

export default function LoginPage() {
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
          border: '1px solid #1E2D4A',
          borderRadius: '1rem',
          padding: '3rem',
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            color: '#E8EDF5',
            marginBottom: '0.75rem',
          }}
        >
          Start Your Audit
        </h1>
        <p style={{ color: '#8B9BB4', marginBottom: '2rem', lineHeight: 1.6 }}>
          Connect your GitHub account to begin the analysis. We request read-only access.
        </p>
        <a
          id="github-login-btn"
          href="/api/auth/github"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: '#E8EDF5',
            color: '#0A0F1E',
            fontWeight: 700,
            fontSize: '1rem',
            padding: '0.875rem 2rem',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </a>
        <p style={{ color: '#4A5568', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          Read-only access. We never write to your repositories.
        </p>
      </div>
    </main>
  )
}
