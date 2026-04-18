import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase server client for Next.js App Router.
 *
 * Uses the anon key with cookie-based auth.
 * Must be called inside a Server Component, Route Handler, or Server Action
 * where `next/headers` cookies() is available.
 *
 * This client respects RLS policies — authenticated user context
 * is derived from the Supabase auth cookie.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookies can't be mutated.
            // This is expected when createSupabaseServerClient is used in
            // `page.tsx` or `layout.tsx` which don't have write access.
          }
        },
      },
    }
  )
}
