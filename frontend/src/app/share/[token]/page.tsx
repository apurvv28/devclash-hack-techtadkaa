import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getFullReport } from '@/lib/report'
import { ReportDashboardClient } from '@/components/dashboard/ReportDashboardClient'

interface SharePageProps {
  params: Promise<{ token: string }>
}

/**
 * Public share page — accessible without authentication.
 * Works like Claude's shareable chat links:
 * /share/<token> renders a read-only version of the audit report.
 */

async function getShareData(token: string) {
  // Look up the share record by token
  const { data: shareRecord, error } = await supabaseAdmin
    .from('audit_shares')
    .select('session_id, token, expires_at')
    .eq('token', token)
    .single()

  if (error || !shareRecord) return null

  // Check if the share link has expired
  if (shareRecord.expires_at) {
    const expiresAt = new Date(shareRecord.expires_at)
    if (expiresAt < new Date()) return null
  }

  return shareRecord
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params
  const shareData = await getShareData(token)

  if (!shareData) {
    return {
      title: 'Report Not Found — DevCareer Intelligence',
      description: 'This shared report link is invalid or has expired.',
    }
  }

  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('github_username')
    .eq('id', shareData.session_id)
    .single()

  const { data: profile } = await supabaseAdmin
    .from('skill_profiles')
    .select('overall_tier, percentile_estimate, commit_archetype')
    .eq('session_id', shareData.session_id)
    .single()

  const username = session?.github_username ?? 'Developer'
  const tier = profile?.overall_tier ?? 'Unknown'
  const percentile = profile?.percentile_estimate ?? 0
  const archetype = profile?.commit_archetype ?? 'Unknown'

  return {
    title: `@${username} — ${tier} Developer | DevCareer Intelligence`,
    description: `Verified ${tier} tier developer (top ${100 - percentile}%) · ${archetype} archetype — Full audit report with skill analysis, market fit, and growth roadmap.`,
    openGraph: {
      title: `@${username} — ${tier} Developer`,
      description: `Verified ${tier} tier (top ${100 - percentile}%) · ${archetype} archetype`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `@${username} — Verified ${tier} Developer`,
      description: `DevCareer Intelligence audit: ${tier} tier, top ${100 - percentile}%`,
    },
  }
}

export default async function PublicSharePage({ params }: SharePageProps) {
  const { token } = await params

  const shareData = await getShareData(token)
  if (!shareData) {
    return <ShareNotFound />
  }

  const report = await getFullReport(shareData.session_id)
  if (!report) {
    return <ShareNotFound />
  }

  // Add share token to the report for downstream use
  report.share_token = token

  return (
    <div className="relative">
      {/* Public badge */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/95 backdrop-blur-xl border border-[#E2E8F0] rounded-full px-5 py-2.5 shadow-lg flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-[#4A5568] font-medium">
            Shared Report — <span className="text-[#003882] font-semibold">View Only</span>
          </span>
          <span className="text-[10px] text-[#718096]">·</span>
          <span className="text-[10px] text-[#718096]">
            DevCareer Intelligence
          </span>
        </div>
      </div>
      
      <ReportDashboardClient report={report} isPublicShare={true} />
    </div>
  )
}

function ShareNotFound() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-8">
      <div className="bg-white border border-[#E2E8F0] p-10 rounded-3xl max-w-lg w-full text-center space-y-6 shadow-lg">
        <div className="w-20 h-20 bg-gradient-to-br from-[#E2E8F0] to-[#CBD5E0] rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-[#718096]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.75 6.75M9.878 9.878l-3.128-3.128M21 12a9 9 0 01-1.457 4.871M14.121 14.121L17.25 17.25" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#1A202C]">Report Not Found</h2>
          <p className="text-[#718096] mt-3 text-sm leading-relaxed">
            This shared report link is either invalid or has expired.
            Share links are valid for 30 days after creation.
          </p>
        </div>
        <a
          href="/"
          className="inline-block bg-gradient-to-r from-[#00A1E4] to-[#003882] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-[#003882] hover:to-[#00A1E4] transition-all duration-200 shadow-md"
        >
          Go to DevCareer Intelligence
        </a>
      </div>
    </div>
  )
}
