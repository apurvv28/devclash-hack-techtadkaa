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
    <div className="text-[#1A202C] font-sans selection:bg-blue-100 selection:text-[#003882]">
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 md:py-16 space-y-12">
        <header className="space-y-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-[#00A1E4] to-[#003882]" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A202C]">
              Intelligence Dashboard
            </h1>
          </div>
          <p className="text-[#4A5568] text-base md:text-lg font-light tracking-wide max-w-2xl pl-5">
            Configure target repositories and initiate deep analysis of your technical profile.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <AuditSubmissionForm username={user.github_username} />
          </div>

          <aside className="lg:col-span-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-sm font-semibold tracking-wide text-[#718096] uppercase">Recent Audits</h2>
              {sessions && sessions.length > 0 && (
                <span className="text-[10px] bg-[#003882]/10 text-[#003882] px-2 py-0.5 rounded-md font-bold">
                  {sessions.length} total
                </span>
              )}
            </div>
            
            {(!sessions || sessions.length === 0) ? (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 bg-gradient-to-br from-[#F0F4F8] to-[#E2E8F0] rounded-2xl flex items-center justify-center border border-[#E2E8F0]">
                  <svg className="w-6 h-6 text-[#718096]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div>
                  <p className="text-[#1A202C] font-semibold text-sm">No audits yet</p>
                  <p className="text-[#718096] text-xs mt-1">Start your first audit to see results here.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <a
                    key={session.id}
                    href={session.status === 'complete' ? `/report/${session.id}` : `/audit/${session.id}`}
                    className="group block bg-white border border-[#E2E8F0] p-5 rounded-2xl hover:border-[#CBD5E0] transition-all duration-200 shadow-sm card-lift"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${session.status === 'complete' ? 'bg-emerald-500' : session.status === 'failed' ? 'bg-[#E2001A]' : 'bg-[#00A1E4] animate-pulse'}`} />
                        <span className="text-sm text-[#1A202C] font-semibold tracking-tight">
                          {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-bold tracking-wider uppercase border ${
                        session.status === 'complete' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                        session.status === 'failed' ? 'bg-red-50 border-red-200 text-[#E2001A]' :
                        'bg-blue-50 border-blue-200 text-[#003882]'
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                    {session.status !== 'complete' && session.status !== 'failed' && (
                      <div className="w-full bg-[#F0F4F8] border border-[#E2E8F0] h-1.5 mt-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#00A1E4] to-[#003882] h-full transition-all duration-700 ease-out rounded-full"
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
