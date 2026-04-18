import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: session_id } = await params

  if (!session_id) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })
  }

  // Check if it's in the dedicated market_fit table first
  const { data: marketFit, error: mfError } = await supabaseAdmin
    .from('market_fit')
    .select('*')
    .eq('session_id', session_id)
    .single()

  if (marketFit && !mfError) {
    return NextResponse.json(marketFit)
  }

  // Fallback: check if it's embedded in audit_reports
  const { data: report } = await supabaseAdmin
    .from('audit_reports')
    .select('market_fit')
    .eq('session_id', session_id)
    .single()

  if (report?.market_fit) {
    return NextResponse.json(report.market_fit)
  }

  // If we couldn't find it, check the session status
  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('status, progress_percent')
    .eq('id', session_id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.status !== 'complete') {
    return NextResponse.json(
      {
        error: 'Market analysis still in progress',
        status: session.status,
        progress_percent: session.progress_percent,
      },
      { status: 404 }
    )
  }

  return NextResponse.json({ error: 'Market data not available' }, { status: 404 })
}
