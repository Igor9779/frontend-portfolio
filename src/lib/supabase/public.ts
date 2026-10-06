import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { publishableKey, supabaseUrl, uncachedFetch } from './config'

// This client never receives request cookies or signs in. Public portfolio reads
// stay anonymous even when the visitor is signed in as an administrator.
export const supabase = createClient<Database>(supabaseUrl!, publishableKey!, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { fetch: uncachedFetch },
})
