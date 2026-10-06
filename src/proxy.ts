import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types/database'
import { authCookieOptions, publishableKey, supabaseUrl, uncachedFetch } from './lib/supabase/config'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient<Database>(supabaseUrl!, publishableKey!, {
    cookieOptions: authCookieOptions,
    global: { fetch: uncachedFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        const previousResponse = response
        response = NextResponse.next({ request })
        previousResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
        for (const name of ['cache-control', 'expires', 'pragma']) {
          const value = previousResponse.headers.get(name)
          if (value) response.headers.set(name, value)
        }
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value))
      },
    },
  })

  try {
    // Refresh and verify SDK-managed sessions before Server Components render.
    // Membership authorization belongs in the data layer, not the proxy.
    await supabase.auth.getClaims()
  } catch {
    // A refresh/network failure cannot grant access: requireAdmin re-verifies
    // with Auth and admin_users, and fails closed with a sanitized message.
  }

  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = { matcher: ['/admin/:path*'] }
