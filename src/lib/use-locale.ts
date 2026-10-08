'use client'

import { useSyncExternalStore } from 'react'
import { createLanguagePreference } from './language-preference'
import { projectCount, translate } from './i18n'

const preference = createLanguagePreference(() => {
  try { return window.localStorage } catch { return null }
})
export function useLocale() {
  const language = useSyncExternalStore(preference.subscribe, preference.getSnapshot, preference.getServerSnapshot)
  return { language, setLanguage: preference.setLanguage,
    t: (message: string, values?: readonly (string | number)[]) => translate(language, message, values),
    countProjects: (count: number, total?: number) => projectCount(language, count, total) }
}
