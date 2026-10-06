'use client'

import { useActionState, useState } from 'react'
import { signIn } from '../../app/admin/actions'

export function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const [state, action, pending] = useActionState(signIn, { error: initialError })
  const [email, setEmail] = useState('')
  const inputClass = 'mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-50 disabled:text-zinc-500'

  return (
    <form action={action} className="mt-8 space-y-5" aria-busy={pending}>
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-zinc-700">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} aria-describedby={state.error ? 'login-error' : undefined} className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className="block text-xs font-medium text-zinc-700">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={4096} disabled={pending} aria-describedby={state.error ? 'login-error' : undefined} className={inputClass} />
      </div>
      {state.error && <p id="login-error" role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">{state.error}</p>}
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
