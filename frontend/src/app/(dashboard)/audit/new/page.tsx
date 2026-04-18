'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAuditPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [repo, setRepo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/audit/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_username: username,
          project_urls: [repo],
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start audit')
      }

      // Navigate to the audit status page
      router.push(`/audit/${data.session_id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8F9FA', padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#FFFFFF', padding: '3rem', borderRadius: '1rem', width: '100%', maxWidth: '500px', border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#1A202C', marginBottom: '1.5rem', fontWeight: 600 }}>Start New Audit</h1>
        
        {error && (
          <div style={{ background: 'rgba(226, 0, 26, 0.08)', color: '#E2001A', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: '#4A5568', marginBottom: '0.5rem', fontSize: '0.875rem' }}>GitHub Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. torvalds"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#F8F9FA', border: '1px solid #E2E8F0', color: '#1A202C' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#4A5568', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Repository URL to Audit</label>
            <input 
              type="url" 
              required
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="https://github.com/user/repo"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#F8F9FA', border: '1px solid #E2E8F0', color: '#1A202C' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '1rem', padding: '0.75rem', background: 'linear-gradient(135deg, #00A1E4 0%, #003882 100%)', color: '#FFFFFF', fontWeight: 'bold', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', boxShadow: '0 4px 16px rgba(0,56,130,0.25)' }}
          >
            {loading ? 'Starting Analysis...' : 'Start Audit'}
          </button>
        </form>
      </div>
    </main>
  )
}
