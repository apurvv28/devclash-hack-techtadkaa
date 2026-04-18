export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 50%, #F8F9FA 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '640px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(0,56,130,0.08)',
            border: '1px solid rgba(0,56,130,0.2)',
            borderRadius: '9999px',
            padding: '0.375rem 1rem',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            color: '#003882',
          }}
        >
          <span>⚡</span>
          <span>Brutally Honest Developer Audit</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            color: '#1A202C',
          }}
        >
          Know Exactly <br />
          <span style={{ color: '#003882' }}>Where You Stand</span>
        </h1>

        <p
          style={{
            fontSize: '1.125rem',
            color: '#4A5568',
            lineHeight: 1.7,
            marginBottom: '2.5rem',
          }}
        >
          DevCareer Intelligence analyzes your GitHub repositories at the source-code level —
          authorship, complexity, security, and quality — then maps your real skills to market
          demand. No guessing. No flattery.
        </p>

        <a
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #00A1E4 0%, #003882 100%)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '1rem',
            padding: '0.875rem 2.5rem',
            borderRadius: '0.75rem',
            transition: 'transform 0.15s, box-shadow 0.15s',
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,56,130,0.25)',
          }}
        >
          Audit My GitHub →
        </a>
      </div>
    </main>
  )
}
