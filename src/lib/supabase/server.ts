import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (or the deployment environment), then restart Next.js.',
  )
}

try {
  const url = new URL(supabaseUrl)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
} catch {
  throw new Error('Invalid Supabase configuration: NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.')
}

export const supabase = createClient<Database>(supabaseUrl, publishableKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    // Read fresh data on every server request; never persist it in Next's cache.
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
  },
})
