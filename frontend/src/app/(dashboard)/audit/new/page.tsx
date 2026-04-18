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
    <main style={{ minHeight: '100vh', background: '#0A0F1E', padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#0D1530', padding: '3rem', borderRadius: '1rem', width: '100%', maxWidth: '500px', border: '1px solid #1E2D4A' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#E8EDF5', marginBottom: '1.5rem', fontWeight: 600 }}>Start New Audit</h1>
        
        {error && (
          <div style={{ background: 'rgba(255, 68, 68, 0.1)', color: '#FF4444', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: '#8B9BB4', marginBottom: '0.5rem', fontSize: '0.875rem' }}>GitHub Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. torvalds"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#1E2D4A', border: '1px solid #2D3D5A', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#8B9BB4', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Repository URL to Audit</label>
            <input 
              type="url" 
              required
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="https://github.com/user/repo"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#1E2D4A', border: '1px solid #2D3D5A', color: 'white' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '1rem', padding: '0.75rem', background: '#00D4FF', color: '#0A0F1E', fontWeight: 'bold', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Starting Analysis...' : 'Start Audit'}
          </button>
        </form>
      </div>
    </main>
  )
}
