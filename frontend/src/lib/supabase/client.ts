import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase browser client for client-side React components.
 * Uses the anon key — all queries are subject to RLS policies.
 * Safe to expose in the browser; never use the service role key here.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton for convenience in client components
let _browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!_browserClient) {
    _browserClient = createSupabaseBrowserClient()
  }
  return _browserClient
}

// Re-export under the old name for backward compat with existing imports
export const supabaseClient = createSupabaseBrowserClient()
