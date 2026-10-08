'use client'

import { useLocale } from '../../lib/use-locale'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { Icon } from './Icon'
import { SignOutButton } from './SignOutButton'

export function AdminHeader() {
  const { t } = useLocale()
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">P</span>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">Portfolio CMS</span>
          <span className="rounded border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500">{t("Admin")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher />
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">{t("View portfolio")}{' '}<Icon name="external" className="h-3.5 w-3.5" />
          </a>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
