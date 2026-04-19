import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.nextUrl.origin))
  
  // Clear auth cookies
  response.cookies.set({
    name: 'user_id',
    value: '',
    expires: new Date(0),
    path: '/',
  })
  
  response.cookies.set({
    name: 'github_username',
    value: '',
    expires: new Date(0),
    path: '/',
  })

  return response
}
