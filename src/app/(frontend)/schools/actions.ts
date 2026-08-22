'use server'

import { revalidatePath } from 'next/cache'

import type { Contact, School } from '@/payload-types'
import { parseCsvRows, runCsvImport, type ImportResult } from '../csvImport'
import { deleteBookingsCascade } from '../deleteCascade'
import { isUniqueFieldViolation } from '../errorHelpers'
import { DEFAULT_LOCALE, isLocale } from '../i18n/locale'
import { t } from '../i18n/t'
import { requireUser } from '../requireUser'

export type ActionResult = { success: true } | { success: false; error: string }
export type CreateResult = { success: true; id: number } | { success: false; error: string }

export type SchoolInput = Partial<
  Pick<
    School,
    | 'name'
    | 'street'
    | 'houseNumber'
    | 'addition'
    | 'postalCode'
    | 'city'
    | 'country'
    | 'phone'
    | 'defaultLocationNote'
    | 'notes'
  >
>

export async function createSchool(data: SchoolInput): Promise<CreateResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE

  try {
    if (!data.name?.trim()) throw new Error(t(locale, 'schools.validationNameRequired'))
    const school = await payload.create({
      collection: 'schools',
      data: { name: data.name, city: data.city },
      user,
      overrideAccess: false,
    })
    revalidatePath('/schools')
    return { success: true, id: Number(school.id) }
  } catch (err) {
    if (isUniqueFieldViolation(err, 'name')) {
      return { success: false, error: t(locale, 'schools.duplicateName', { name: data.name ?? '' }) }
    }
    const message = err instanceof Error ? err.message : 'Could not create school'
    return { success: false, error: message }
  }
}

export async function updateSchool(id: number, data: SchoolInput): Promise<ActionResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE

  try {
    await payload.update({ collection: 'schools', id, data, user, overrideAccess: false })
    revalidatePath('/schools')
    revalidatePath(`/schools/${id}`)
    return { success: true }
  } catch (err) {
    if (isUniqueFieldViolation(err, 'name')) {
      return { success: false, error: t(locale, 'schools.duplicateName', { name: data.name ?? '' }) }
    }
    const message = err instanceof Error ? err.message : 'Could not save school'
    return { success: false, error: message }
  }
}

export async function deleteSchool(id: number): Promise<ActionResult> {
  return deleteSchools([id])
}

/**
 * Deletes every listed School, cascading their Bookings (and those
 * Bookings' Lessons) and Contacts first — see deleteCascade.ts for why
 * that's necessary rather than a single `payload.delete`. Used by both
 * the single "Remove" action and the Schools list's bulk-delete.
 */
export async function deleteSchools(ids: number[]): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await deleteBookingsCascade(payload, user, { school: { in: ids } })
    await payload.delete({ collection: 'contacts', where: { school: { in: ids } }, user, overrideAccess: false })
    await payload.delete({ collection: 'schools', where: { id: { in: ids } }, user, overrideAccess: false })
    revalidatePath('/schools')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove schools'
    return { success: false, error: message }
  }
}

/**
 * Expected CSV columns: name (required), street, houseNumber, addition,
 * postalCode, city, country, phone, defaultLocationNote, notes -- matching
 * Schools.ts's own fields directly, so a spreadsheet exported from this
 * app's own data (or one someone builds by hand from the field list) needs
 * no translation layer.
 */
export async function importSchoolsCsv(csvText: string): Promise<ImportResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE
  const rows = parseCsvRows(csvText)

  const result = await runCsvImport(rows, async (row) => {
    if (!row.name) throw new Error(t(locale, 'schools.validationNameRequired'))

    try {
      await payload.create({
        collection: 'schools',
        data: {
          name: row.name,
          street: row.street || undefined,
          houseNumber: row.houseNumber || undefined,
          addition: row.addition || undefined,
          postalCode: row.postalCode || undefined,
          city: row.city || undefined,
          country: row.country || undefined,
          phone: row.phone || undefined,
          defaultLocationNote: row.defaultLocationNote || undefined,
          notes: row.notes || undefined,
        },
        user,
        overrideAccess: false,
      })
    } catch (err) {
      if (isUniqueFieldViolation(err, 'name')) {
        throw new Error(t(locale, 'schools.duplicateName', { name: row.name }))
      }
      throw err
    }
  })

  revalidatePath('/schools')
  return result
}

export type ContactInput = Pick<Contact, 'fullName' | 'firstName' | 'lastName' | 'email' | 'phone'>

export async function createContact(
  schoolId: number,
  data: ContactInput,
): Promise<CreateResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE

  try {
    if (!data.fullName?.trim()) throw new Error(t(locale, 'schools.validationFullNameRequired'))
    const contact = await payload.create({
      collection: 'contacts',
      data: { ...data, school: schoolId },
      user,
      overrideAccess: false,
    })
    revalidatePath(`/schools/${schoolId}`)
    return { success: true, id: Number(contact.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add contact'
    return { success: false, error: message }
  }
}

export async function deleteContact(id: number, schoolId: number): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.delete({ collection: 'contacts', id, user, overrideAccess: false })
    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove contact'
    return { success: false, error: message }
  }
}
