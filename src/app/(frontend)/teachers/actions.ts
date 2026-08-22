'use server'

import { revalidatePath } from 'next/cache'

import type { Teacher } from '@/payload-types'
import { parseCsvBoolean, parseCsvRows, runCsvImport, type ImportResult } from '../csvImport'
import { isUniqueFieldViolation } from '../errorHelpers'
import { DEFAULT_LOCALE, isLocale } from '../i18n/locale'
import { t } from '../i18n/t'
import { requireUser } from '../requireUser'

export type ActionResult = { success: true } | { success: false; error: string }
export type CreateResult = { success: true; id: number } | { success: false; error: string }

export type TeacherInput = Pick<Teacher, 'displayName' | 'kind' | 'email' | 'phone' | 'active'>

export async function createTeacher(data: TeacherInput): Promise<CreateResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE

  try {
    const teacher = await payload.create({
      collection: 'teachers',
      data,
      user,
      overrideAccess: false,
    })
    revalidatePath('/teachers')
    return { success: true, id: Number(teacher.id) }
  } catch (err) {
    if (isUniqueFieldViolation(err, 'displayName')) {
      return { success: false, error: t(locale, 'teachers.duplicateName', { name: data.displayName }) }
    }
    const message = err instanceof Error ? err.message : 'Could not create teacher'
    return { success: false, error: message }
  }
}

export async function updateTeacher(id: number, data: Partial<TeacherInput>): Promise<ActionResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE

  try {
    await payload.update({ collection: 'teachers', id, data, user, overrideAccess: false })
    revalidatePath('/teachers')
    revalidatePath(`/teachers/${id}`)
    return { success: true }
  } catch (err) {
    if (isUniqueFieldViolation(err, 'displayName')) {
      return { success: false, error: t(locale, 'teachers.duplicateName', { name: data.displayName ?? '' }) }
    }
    const message = err instanceof Error ? err.message : 'Could not save teacher'
    return { success: false, error: message }
  }
}

/**
 * Expected CSV columns: displayName (required), kind (person/organisation,
 * defaults to person), email, phone, active (true/false, defaults to true)
 * -- matching Teachers.ts's own fields directly.
 */
export async function importTeachersCsv(csvText: string): Promise<ImportResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE
  const rows = parseCsvRows(csvText)

  const result = await runCsvImport(rows, async (row) => {
    if (!row.displayName) throw new Error(t(locale, 'teachers.validationNameRequired'))

    const kind = row.kind ? row.kind.toLowerCase() : 'person'
    if (kind !== 'person' && kind !== 'organisation') {
      throw new Error(t(locale, 'csvImport.invalidKind'))
    }

    const active = parseCsvBoolean(row.active, true)
    if (active === 'invalid') {
      throw new Error(t(locale, 'csvImport.invalidBoolean', { field: 'active' }))
    }

    try {
      await payload.create({
        collection: 'teachers',
        data: {
          displayName: row.displayName,
          kind,
          email: row.email || undefined,
          phone: row.phone || undefined,
          active,
        },
        user,
        overrideAccess: false,
      })
    } catch (err) {
      if (isUniqueFieldViolation(err, 'displayName')) {
        throw new Error(t(locale, 'teachers.duplicateName', { name: row.displayName }))
      }
      throw err
    }
  })

  revalidatePath('/teachers')
  return result
}

export async function deleteTeacher(id: number): Promise<ActionResult> {
  return deleteTeachers([id])
}

/**
 * Deletes every listed Teacher. No cascade needed here (unlike Schools/
 * Programs) — LessonTemplates.defaultTeacher and Lessons.teachers are
 * both nullable, real DB columns with a working ON DELETE SET
 * NULL/CASCADE, so removing a teacher just clears them from any
 * lesson's teacher list rather than blocking on a constraint.
 */
export async function deleteTeachers(ids: number[]): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.delete({ collection: 'teachers', where: { id: { in: ids } }, user, overrideAccess: false })
    revalidatePath('/teachers')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove teachers'
    return { success: false, error: message }
  }
}
