export type Locale = 'en' | 'nl'

export const LOCALES: Locale[] = ['en', 'nl']

export const DEFAULT_LOCALE: Locale = 'en'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as string[]).includes(value)
}
