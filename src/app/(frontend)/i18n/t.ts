import { dictionaries, type Dictionary } from './dictionary'
import { DEFAULT_LOCALE, type Locale } from './locale'

type DotPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? DotPaths<T[K], `${Prefix}${K}.`>
      : never
}[keyof T & string]

export type TranslationKey = DotPaths<Dictionary>

function lookup(dict: Dictionary, key: string): string | undefined {
  const parts = key.split('.')
  let node: unknown = dict
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

/**
 * Plain, framework-agnostic translation lookup — usable from Server
 * Components (where there's no React context) and Client Components
 * alike. `useLocale()` below wraps this for client components that
 * already have a locale from LocaleProvider, to avoid threading it
 * through every prop signature.
 */
export function t(locale: Locale, key: TranslationKey, vars?: Record<string, string | number>): string {
  const template = lookup(dictionaries[locale], key) ?? lookup(dictionaries[DEFAULT_LOCALE], key) ?? key

  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}
