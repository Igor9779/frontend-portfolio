'use server'

import { redirect } from 'next/navigation'
import { checkAdminAccess } from '../../lib/auth'
import { createClient } from '../../lib/supabase/server'

export async function signIn(_previous: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  const rawEmail = formData.get('email')
  const password = formData.get('password')
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : ''
  if (!email || typeof password !== 'string' || !password) {
    return { error: 'Enter your email and password.' }
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length > 4096) {
    return { error: 'Invalid email or password.' }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: error.status === 400 || error.status === 401
        ? 'Invalid email or password.'
        : 'Sign-in is temporarily unavailable. Please try again.' }
    }
    if (!data.user) return { error: 'Sign-in is temporarily unavailable. Please try again.' }

    const access = await checkAdminAccess(supabase)
    if (access.status !== 'admin') {
      await supabase.auth.signOut({ scope: 'local' })
      return { error: access.status === 'denied'
        ? 'You do not have permission to access this CMS.'
        : 'Unable to verify access. Please try again.' }
    }
  } catch {
    return { error: 'Sign-in is temporarily unavailable. Please try again.' }
  }

  // redirect throws; keep it outside the error handler.
  redirect('/admin')
}

export async function signOut(): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) return { error: 'Unable to sign out. Please try again.' }
  } catch {
    return { error: 'Unable to sign out. Please try again.' }
  }
  redirect('/admin/login')
}
