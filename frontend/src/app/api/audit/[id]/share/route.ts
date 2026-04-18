import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AuditShareResponse } from '@/types/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params

  // Fetch session + skill profile for OG metadata
  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('id, status, github_username')
    .eq('id', id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.status !== 'complete') {
    return NextResponse.json({ error: 'Report not yet complete' }, { status: 409 })
  }

  const { data: profile } = await supabaseAdmin
    .from('skill_profiles')
    .select('overall_tier, percentile_estimate, commit_archetype')
    .eq('session_id', id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const shareUrl = `${appUrl}/report/${id}`

  const tierLabel = profile?.overall_tier ?? 'Unknown'
  const percentile = profile?.percentile_estimate ?? 0

  return NextResponse.json({
    share_url: shareUrl,
    og_title: `@${session.github_username} — ${tierLabel} Developer`,
    og_description: `Verified ${tierLabel} tier (top ${100 - percentile}%) · ${profile?.commit_archetype ?? 'Unknown'} archetype — DevCareer Intelligence audit report`,
  })
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const userId = request.cookies.get('user_id')?.value

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: session } = await supabaseAdmin
    .from('audit_sessions')
    .select('id, status, user_id')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.status !== 'complete') {
    return NextResponse.json({ error: 'Report must be complete before sharing' }, { status: 409 })
  }

  const shareToken = crypto.randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  const { error } = await supabaseAdmin
    .from('audit_shares')
    .upsert(
      {
        session_id: id,
        token: shareToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const shareUrl = `${appUrl}/report/${id}?token=${shareToken}`

  const response: AuditShareResponse = {
    share_url: shareUrl,
    expires_at: expiresAt.toISOString(),
    token: shareToken,
  }

  return NextResponse.json(response, { status: 201 })
}
