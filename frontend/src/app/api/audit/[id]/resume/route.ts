import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { addAuditJob } from '@/lib/queue/client'
import type { AuditStatus } from '@/types/index'

const ResumeSchema = z.object({
  from_stage: z.enum([
    'queued',
    'fetching_github',
    'analyzing_code',
    'auditing_live',
    'synthesizing_ai',
    'fetching_market',
  ] as const),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.status !== 'failed') {
    return NextResponse.json(
      { error: 'Can only resume failed audits' },
      { status: 409 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = ResumeSchema.safeParse(body)
  const fromStage: AuditStatus = parsed.success ? parsed.data.from_stage : 'queued'

  // Reset status
  await supabaseAdmin
    .from('audit_sessions')
    .update({
      status: fromStage,
      error_message: null,
    })
    .eq('id', id)

  // Re-enqueue
  await addAuditJob(id, {
    github_username: session.github_username,
    project_urls: session.project_urls,
    resume_text: session.resume_text,
    target_branch: session.target_branch,
    target_module_path: session.target_module_path,
  })

  return NextResponse.json({ session_id: id, status: fromStage })
}
