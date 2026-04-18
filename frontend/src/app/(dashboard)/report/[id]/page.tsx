import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getFullReport } from '@/lib/report'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ReportDashboardClient } from '@/components/dashboard/ReportDashboardClient'

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
    description: 'Detailed developer skill audit report with visualizations',
  }
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params

  // Check if session exists
  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!session) {
    notFound()
  }

  // If not complete, redirect to live audit page
  if (session.status !== 'complete') {
    redirect(`/audit/${id}`)
  }

  // Fetch the full report
  const report = await getFullReport(id)

  if (!report) {
    redirect(`/audit/${id}`)
  }

  return <ReportDashboardClient report={report} />
}
