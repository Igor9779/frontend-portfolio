import 'server-only'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
export const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

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

// Auth runs exclusively on the server. The SDK owns cookie names and contents.
export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export const uncachedFetch: typeof fetch = (input, init) => fetch(input, {
  ...init,
  cache: 'no-store',
  signal: init?.signal ?? AbortSignal.timeout(10_000),
})
