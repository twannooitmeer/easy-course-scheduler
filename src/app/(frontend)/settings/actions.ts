'use server'

import { revalidatePath } from 'next/cache'

import { isLocale, type Locale } from '../i18n/locale'
import { requireUser } from '../requireUser'

export type ActionResult = { success: true } | { success: false; error: string }

/**
 * Updates the CALLING user's own preferredLanguage only — `requireUser()`
 * resolves the id from the session, not from a client-supplied value, so
 * this can never be used to change another user's language.
 */
export async function updateOwnPreferredLanguage(locale: Locale): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  if (!isLocale(locale)) {
    return { success: false, error: 'Unsupported language' }
  }

  try {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { preferredLanguage: locale },
      user,
      overrideAccess: false,
    })
    // Revalidates the root layout (nav labels, <html lang>) as well as the
    // settings page itself, since preferredLanguage is read server-side in
    // layout.tsx on every request.
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save language preference'
    return { success: false, error: message }
  }
}
