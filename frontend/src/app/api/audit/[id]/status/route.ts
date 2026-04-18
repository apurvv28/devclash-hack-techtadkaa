import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AuditStatusResponse } from '@/types/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const userId = request.cookies.get('user_id')?.value

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: session, error } = await supabaseAdmin
    .from('audit_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Audit session not found' }, { status: 404 })
  }

  const response: AuditStatusResponse = {
    session,
    current_stage: session.status,
    eta_seconds: estimateETA(session.status, session.progress_percent),
    error_message: session.error_message ?? undefined,
  }

  return NextResponse.json(response)
}

function estimateETA(status: string, progress: number): number | undefined {
  const stageDurations: Record<string, number> = {
    queued: 10,
    fetching_github: 60,
    analyzing_code: 120,
    auditing_live: 90,
    synthesizing_ai: 60,
    fetching_market: 30,
  }

  if (status === 'complete' || status === 'failed') return undefined

  const stageDuration = stageDurations[status] ?? 60
  const remainingInStage = stageDuration * (1 - progress / 100)

  return Math.round(remainingInStage)
}
