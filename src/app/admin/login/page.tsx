import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from '../../../components/admin/LoginForm'
import { Icon } from '../../../components/admin/Icon'
import { getAdminAccess } from '../../../lib/auth'

export const metadata: Metadata = {
  title: 'Sign in — Portfolio CMS',
  robots: { index: false, follow: false },
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await getAdminAccess()
  if (access.status === 'admin') redirect('/admin')
  const { error } = await searchParams
  const initialError = access.status === 'denied' || error === 'unauthorized'
    ? 'You do not have permission to access this CMS.'
    : access.status === 'unavailable' || error === 'unavailable'
      ? 'Unable to verify access. Please try again.'
      : null

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f8f9fa] px-5 py-12 text-zinc-900">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 flex items-center gap-3">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">P</span>
          <span className="text-sm font-semibold tracking-tight">Portfolio CMS</span>
          <span className="rounded border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500">Admin</span>
        </div>
        <section aria-labelledby="login-heading" className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <Icon name="lock" className="mb-4 h-5 w-5 text-zinc-400" />
          <h1 id="login-heading" className="text-xl font-semibold tracking-tight">Administrator sign in</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Sign in to access your portfolio workspace.</p>
          <LoginForm initialError={initialError} clearAdminDraft={access.status === 'anonymous'} />
        </section>
        <a href="/" className="mt-6 inline-flex min-h-10 items-center rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900">← Back to portfolio</a>
      </div>
    </main>
  )
}
