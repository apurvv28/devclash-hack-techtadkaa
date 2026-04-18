import React from 'react'
import { AuditSubmissionForm } from '@/components/audit/AuditSubmissionForm'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    redirect('/')
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('github_username')
    .eq('id', userId)
    .single()

  if (!user?.github_username) {
    redirect('/')
  }

  const { data: sessions } = await supabaseAdmin
    .from('audit_sessions')
    .select('id, status, created_at, progress_percent')
    .eq('github_username', user.github_username)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] font-sans selection:bg-blue-100 selection:text-[#003882]">
      {/* Subtle background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-200/20 to-transparent blur-[100px] pointer-events-none rounded-full" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24 space-y-16">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-[#1A202C]">
            Intelligence Dashboard
          </h1>
          <p className="text-[#4A5568] text-base md:text-lg font-light tracking-wide max-w-2xl">
            Configure target repositories and initiate deep analysis of your technical profile.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          <div className="lg:col-span-7">
            <AuditSubmissionForm username={user.github_username} />
          </div>

          <aside className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-sm font-medium tracking-wide text-[#718096] uppercase">Recent Activity</h2>
            </div>
            
            {(!sessions || sessions.length === 0) ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
                <div className="bg-[#F0F4F8] rounded-full p-3 border border-[#E2E8F0]">
                  <svg className="w-5 h-5 text-[#718096]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <p className="text-[#718096] text-sm font-medium">No prior intelligence captures.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <a
                    key={session.id}
                    href={session.status === 'complete' ? `/report/${session.id}` : `/audit/${session.id}`}
                    className="group block bg-white border border-[#E2E8F0] p-5 rounded-xl hover:bg-[#F0F4F8] hover:border-[#CBD5E0] transition duration-200 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${session.status === 'complete' ? 'bg-emerald-500' : session.status === 'failed' ? 'bg-[#E2001A]' : 'bg-[#00A1E4] animate-pulse'}`} />
                        <span className="text-sm text-[#1A202C] font-medium tracking-tight">
                          {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase border ${
                        session.status === 'complete' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                        session.status === 'failed' ? 'bg-red-50 border-red-200 text-[#E2001A]' :
                        'bg-blue-50 border-blue-200 text-[#003882]'
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                    {session.status !== 'complete' && session.status !== 'failed' && (
                      <div className="w-full bg-[#E9ECEF] border border-[#E2E8F0] h-1 mt-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#00A1E4] h-full transition-all duration-700 ease-out relative"
                          style={{ width: `${session.progress_percent}%` }}
                        />
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
