import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  const clientId = process.env.GITHUB_CLIENT_ID!
  const redirectUri = process.env.GITHUB_REDIRECT_URI!
  const scope = 'read:user user:email repo'
  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  })

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

  const response = NextResponse.redirect(githubAuthUrl)
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
