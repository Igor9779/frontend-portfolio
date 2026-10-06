'use client'

import { useActionState } from 'react'
import { signOut } from '../../app/admin/actions'

export function SignOutButton() {
  const [state, action, pending] = useActionState(signOut, { error: null })
  return (
    <form action={action} aria-busy={pending} className="relative">
      <button type="submit" disabled={pending} aria-describedby={state.error ? 'sign-out-error' : undefined} className="min-h-9 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
      {state.error && <p id="sign-out-error" role="alert" className="absolute top-full right-0 z-10 mt-2 w-56 rounded-md border border-red-200 bg-white p-3 text-xs text-red-800 shadow-sm">{state.error}</p>}
    </form>
  )
}
