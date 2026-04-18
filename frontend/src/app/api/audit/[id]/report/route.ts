import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AuditReport } from '@/types/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const userId = request.cookies.get('user_id')?.value

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify ownership
  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('id, status, github_username, user_id')
    .eq('id', id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Allow shared reports (check share_token header)
  const shareToken = request.headers.get('X-Share-Token')
  const isOwner = session.user_id === userId

  if (!isOwner && !shareToken) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (session.status !== 'complete') {
    return NextResponse.json(
      { error: 'Report not yet available', status: session.status },
      { status: 202 }
    )
  }

  const { data: report } = await supabaseAdmin
    .from('audit_reports')
    .select('*')
    .eq('session_id', id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  return NextResponse.json(report as AuditReport)
}
