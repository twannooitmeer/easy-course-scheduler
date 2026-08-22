'use client'

import { createContext, useContext, useMemo } from 'react'

import { t as translate, type TranslationKey } from './t'
import { DEFAULT_LOCALE, type Locale } from './locale'

type LocaleContextValue = {
  locale: Locale
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key) => translate(DEFAULT_LOCALE, key),
})

/**
 * Provides the signed-in user's preferredLanguage (set on the server, in
 * layout.tsx, from their Users record — see Settings.tsx for where it's
 * changed) to every client component below it via useLocale(), without
 * threading `locale` through each component's props by hand.
 */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext)
}
