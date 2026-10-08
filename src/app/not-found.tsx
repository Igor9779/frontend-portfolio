'use client'

import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useLocale } from '../lib/use-locale'

export default function NotFound() {
  const { t } = useLocale()
  return <main id="main-content" className="mx-auto w-[calc(100%-40px)] max-w-[1080px] py-20 small-mobile:w-[calc(100%-28px)]">
    <LanguageSwitcher />
    <p className="mt-8 text-sm text-zinc-500">404</p>
    <h1 className="mt-2 text-2xl font-semibold">{t('Page not found')}</h1>
    <p className="mt-3 text-sm leading-6 text-zinc-600">{t('This page is unavailable. Return to the portfolio to explore the projects.')}</p>
    <a href="/" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">{t('Back to portfolio')}</a>
  </main>
}
