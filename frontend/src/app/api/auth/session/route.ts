import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.cookies.get('user_id')?.value

  if (!userId) {
    return NextResponse.json({ user: null, authenticated: false }, { status: 401 })
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, github_username, name, email, avatar_url')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return NextResponse.json({ user: null, authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      github_username: user.github_username,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
    },
    authenticated: true,
  })
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('session_id')
  response.cookies.delete('user_id')
  return response
}
