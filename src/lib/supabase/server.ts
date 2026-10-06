import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../../types/database'
import { authCookieOptions, publishableKey, supabaseUrl, uncachedFetch } from './config'

export async function createClient() {
  const cookieStore = await cookies()

  // A new authenticated client per request prevents sessions crossing users.
  return createServerClient<Database>(supabaseUrl!, publishableKey!, {
    cookieOptions: authCookieOptions,
    global: { fetch: uncachedFetch },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot write cookies. The admin-scoped proxy
          // refreshes them before rendering; Server Actions can write here.
        }
      },
    },
  })
}
