import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
  error?: string
  error_description?: string
}

interface GitHubUserResponse {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
  html_url: string
  bio: string | null
  public_repos: number
  followers: number
  following: number
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = request.cookies.get('oauth_state')?.value

  // Validate CSRF state
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  try {
    // Exchange code for token
    const tokenResponse = await axios.post<GitHubTokenResponse>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI,
      },
      {
        headers: { Accept: 'application/json' },
        timeout: 10000,
      }
    )

    const { access_token, error, error_description } = tokenResponse.data

    if (error || !access_token) {
      console.error('GitHub token exchange failed:', error_description)
      return NextResponse.redirect(new URL(`/login?error=${error ?? 'token_exchange_failed'}`, request.url))
    }

    // Fetch GitHub user profile
    const userResponse = await axios.get<GitHubUserResponse>(
      'https://api.github.com/user',
      {
        headers: {
          Authorization: `token ${access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        timeout: 10000,
      }
    )

    const githubUser = userResponse.data

    // Upsert user in Supabase
    const { data: user, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          github_id: githubUser.id.toString(),
          github_username: githubUser.login,
          name: githubUser.name,
          email: githubUser.email,
          avatar_url: githubUser.avatar_url,
          github_token_encrypted: access_token, // TODO: encrypt in production
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'github_id' }
      )
      .select('id')
      .single()

    if (upsertError) {
      console.error('User upsert failed:', upsertError)
      return NextResponse.redirect(new URL('/login?error=db_error', request.url))
    }

    // Create session
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const response = NextResponse.redirect(new URL('/dashboard', request.url))

    response.cookies.delete('oauth_state')
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })
    response.cookies.set('user_id', user!.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}
