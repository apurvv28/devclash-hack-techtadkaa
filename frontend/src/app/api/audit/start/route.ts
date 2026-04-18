import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { addAuditJob } from '@/lib/queue/client'
import type { AuditSession } from '@/types/index'

import { isMemoryMode } from '@/lib/queue/client'

const StartAuditSchema = z.object({
  github_username: z.string().min(1).max(39),
  project_urls: z.array(z.string().url()).min(1).max(10),
  deployment_url: z.string().url().optional(),
  resume_text: z.string().max(10000).optional(),
  target_branch: z.string().max(255).optional(),
  target_module_path: z.string().max(500).optional(),
})

let memoryWorkerStarted = false

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (isMemoryMode() && !memoryWorkerStarted) {
    memoryWorkerStarted = true
    const { createAuditOrchestrator } = await import('../../../../../worker/orchestrator')
    createAuditOrchestrator()
    console.log('[Dev] Started in-memory orchestrator inside Next.js process.')
  }

  const userId = request.cookies.get('user_id')?.value
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = StartAuditSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { github_username, project_urls, deployment_url, resume_text, target_branch, target_module_path } = parsed.data

  // Create audit session in DB
  const session: Omit<AuditSession, 'id'> = {
    github_username,
    project_urls,
    deployment_url,
    resume_text,
    target_branch,
    target_module_path,
    status: 'queued',
    progress_percent: 0,
    ui_ux_skipped: !deployment_url,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('audit_sessions')
    .insert(session)
    .select('id')
    .single()

  if (error || !data) {
    console.error('Failed to create audit session:', error)
    return NextResponse.json({ error: 'Failed to create audit session' }, { status: 500 })
  }

  const sessionId = data.id

  try {
    await addAuditJob(sessionId, {
      github_username,
      project_urls,
      deployment_url,
      resume_text,
      target_branch,
      target_module_path,
    })
  } catch (queueError) {
    console.error('Failed to enqueue audit job:', queueError)
    // Mark session as failed if we can't enqueue
    await supabaseAdmin
      .from('audit_sessions')
      .update({ status: 'failed' })
      .eq('id', sessionId)

    return NextResponse.json(
      { error: 'Failed to start audit — queue unavailable' },
      { status: 503 }
    )
  }

  return NextResponse.json(
    { session_id: sessionId, status: 'queued' },
    { status: 201 }
  )
}
