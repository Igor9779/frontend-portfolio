import 'server-only'

import { isAuthSessionMissingError, type SupabaseClient, type User } from '@supabase/supabase-js'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Database } from '../types/database'
import { createClient } from './supabase/server'

type AdminAccess =
  | { status: 'admin'; user: User; supabase: SupabaseClient<Database> }
  | { status: 'anonymous' | 'denied' | 'unavailable' }

export async function checkAdminAccess(supabase: SupabaseClient<Database>): Promise<AdminAccess> {
  try {
    // getUser verifies identity with Auth, including revoked sessions. Never
    // authorize using the unverified user embedded in a cookie/getSession().
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      if (isAuthSessionMissingError(authError) || authError.status === 401 || authError.status === 403) {
        return { status: 'anonymous' }
      }
      console.error('Administrator identity verification is unavailable.')
      return { status: 'unavailable' }
    }
    if (!user) return { status: 'anonymous' }

    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .abortSignal(AbortSignal.timeout(10_000))
      .maybeSingle()

    if (error) {
      // A code helps diagnose SELECT grants/RLS without exposing identities,
      // query details, credentials or the raw database error message.
      const code = /^[A-Z0-9]{5,12}$/.test(error.code) ? ` (${error.code})` : ''
      console.error(`Administrator membership lookup failed${code}.`)
      return { status: 'unavailable' }
    }
    if (data?.user_id !== user.id) return { status: 'denied' }
    return { status: 'admin', user, supabase }
  } catch {
    console.error('Administrator access verification is unavailable.')
    return { status: 'unavailable' }
  }
}

// React cache only deduplicates within a render, never across users/requests.
export const getAdminAccess = cache(async () => checkAdminAccess(await createClient()))

// Reuse at the data boundary and in future authorized Server Actions. A layout
// alone does not protect data access or independently callable operations.
export async function requireAdmin() {
  const access = await getAdminAccess()
  if (access.status === 'admin') return access
  if (access.status === 'denied') redirect('/admin/login?error=unauthorized')
  if (access.status === 'unavailable') redirect('/admin/login?error=unavailable')
  redirect('/admin/login')
}
