import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createParser } from 'eventsource-parser'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params
  const userId = request.cookies.get('user_id')?.value

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Verify this audit belongs to the user
  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('id, status, progress_percent')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!session) {
    return new Response('Not Found', { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastProgress = session.progress_percent
      let lastStatus = session.status

      const sendEvent = (data: Record<string, unknown>) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      // Poll Supabase for progress updates
      let retries = 0
      const maxRetries = 180 // 15 minutes at 5s intervals

      while (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 5000))

        const { data: current } = await supabaseAdmin
          .from('audit_sessions')
          .select('status, progress_percent, error_message')
          .eq('id', id)
          .single()

        if (!current) {
          sendEvent({ type: 'error', error: 'Session not found' })
          controller.close()
          return
        }

        if (current.progress_percent !== lastProgress || current.status !== lastStatus) {
          lastProgress = current.progress_percent
          lastStatus = current.status

          sendEvent({
            type: current.status === lastStatus ? 'progress' : 'stage_change',
            stage: current.status,
            progress_percent: current.progress_percent,
            message: `Stage: ${current.status}`,
          })
        }

        if (current.status === 'complete') {
          sendEvent({ type: 'complete', stage: 'complete', progress_percent: 100 })
          controller.close()
          return
        }

        if (current.status === 'failed') {
          sendEvent({ type: 'error', error: current.error_message ?? 'Audit failed' })
          controller.close()
          return
        }

        retries++
      }

      sendEvent({ type: 'error', error: 'Audit timed out' })
      controller.close()
    },
    cancel() {
      // Client disconnected
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
