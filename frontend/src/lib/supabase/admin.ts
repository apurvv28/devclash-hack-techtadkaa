import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase admin client using the SERVICE_ROLE_KEY.
 *
 * This client BYPASSES Row Level Security — it has full read/write access
 * to every table. Use only in:
 *   - API Route Handlers (server-side)
 *   - Worker processes (BullMQ jobs)
 *   - Migration scripts
 *
 * NEVER import this in client-side code or expose the service role key.
 */
let _adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Ensure environment variables are set before calling getSupabaseAdmin().'
      )
    }

    _adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return _adminClient
}

// Lazy-initialized singleton — backward compatible with existing imports.
// Bypasses module hoisting dependency injection crashes gracefully.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseAdmin()
    const value = Reflect.get(client, prop)
    return typeof value === 'function' ? value.bind(client) : value
  }
})
