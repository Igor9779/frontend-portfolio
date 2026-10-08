import { languageKey, parseLanguage, type Language } from './i18n'

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>
export function createLanguagePreference(storage: () => PreferenceStorage | null) {
  let language: Language = 'en'
  let initialized = false
  const listeners = new Set<() => void>()
  function notify() { for (const listener of listeners) listener() }
  return {
    getSnapshot: () => language,
    // Server render and first hydration always agree, regardless of browser
    // storage. Preferences apply only after the client subscribes.
    getServerSnapshot: (): Language => 'en',
    subscribe(listener: () => void) {
      listeners.add(listener)
      if (!initialized) {
        initialized = true
        try { language = parseLanguage(storage()?.getItem(languageKey)) } catch { language = 'en' }
        queueMicrotask(notify)
      }
      return () => { listeners.delete(listener) }
    },
    setLanguage(value: unknown) {
      language = parseLanguage(value)
      initialized = true
      try { storage()?.setItem(languageKey, language) } catch { /* Preference still works in memory. */ }
      notify()
    },
  }
}
