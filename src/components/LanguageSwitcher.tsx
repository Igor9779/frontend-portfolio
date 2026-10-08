'use client'

import { useEffect } from 'react'
import { languages } from '../lib/i18n'
import { useLocale } from '../lib/use-locale'

export function LocalizedText({ children }: { children: string }) {
  return useLocale().t(children)
}
export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { language, setLanguage, t } = useLocale()
  useEffect(() => { document.documentElement.lang = language }, [language])
  const names = { en: 'English (EN)', uk: 'Українська (UK)', ru: 'Русский (RU)' }
  return <nav aria-label={t('Interface language')} className={`inline-flex shrink-0 gap-1 rounded-lg border p-1 ${dark ? 'border-white/20 bg-white/5 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}>
    {languages.map(value => <button key={value} type="button" lang={value} aria-label={names[value]} aria-pressed={language === value}
      onClick={() => setLanguage(value)} className={`min-h-10 min-w-10 rounded-md px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${dark ? 'focus-visible:outline-white hover:bg-white/15' : 'focus-visible:outline-zinc-900 hover:bg-zinc-100'} ${language === value ? dark ? 'bg-white/20' : 'bg-zinc-900 text-white hover:bg-zinc-700' : ''}`}>
      {value.toUpperCase()}
    </button>)}
  </nav>
}
