'use server'

import { revalidatePath } from 'next/cache'

import type { Program } from '@/payload-types'
import { parseCsvBoolean, parseCsvNumber, parseCsvRows, runCsvImport, type ImportResult } from '../csvImport'
import { deleteBookingsCascade } from '../deleteCascade'
import { isUniqueFieldViolation } from '../errorHelpers'
import { DEFAULT_LOCALE, isLocale } from '../i18n/locale'
import { t } from '../i18n/t'
import { requireUser } from '../requireUser'

const SOORT_OPTIONS = ['regulier', 'maatwerk', 'cmk', 'kbw'] as const

export type ActionResult = { success: true } | { success: false; error: string }
export type CreateResult = { success: true; id: number } | { success: false; error: string }

export type ProgramInput = Partial<
  Pick<
    Program,
    'name' | 'description' | 'soort' | 'defaultLessonCount' | 'defaultLessonDurationMinutes' | 'price' | 'active'
  >
>

export async function createProgram(data: ProgramInput): Promise<CreateResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE

  try {
    if (!data.name?.trim()) throw new Error(t(locale, 'programs.validationNameRequired'))
    const program = await payload.create({
      collection: 'programs',
      data: { name: data.name, soort: data.soort },
      user,
      overrideAccess: false,
    })
    revalidatePath('/programs')
    return { success: true, id: Number(program.id) }
  } catch (err) {
    if (isUniqueFieldViolation(err, 'name')) {
      return { success: false, error: t(locale, 'programs.duplicateName', { name: data.name ?? '' }) }
    }
    const message = err instanceof Error ? err.message : 'Could not create program'
    return { success: false, error: message }
  }
}

export async function updateProgram(id: number, data: ProgramInput): Promise<ActionResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE

  try {
    await payload.update({ collection: 'programs', id, data, user, overrideAccess: false })
    revalidatePath('/programs')
    revalidatePath(`/programs/${id}`)
    return { success: true }
  } catch (err) {
    if (isUniqueFieldViolation(err, 'name')) {
      return { success: false, error: t(locale, 'programs.duplicateName', { name: data.name ?? '' }) }
    }
    const message = err instanceof Error ? err.message : 'Could not save program'
    return { success: false, error: message }
  }
}

/**
 * Expected CSV columns: name (required), description, soort (regulier/
 * maatwerk/cmk/kbw, optional), defaultLessonCount, defaultLessonDurationMinutes,
 * price, active (true/false, defaults to true) -- matching Programs.ts's own
 * fields directly.
 */
export async function importProgramsCsv(csvText: string): Promise<ImportResult> {
  const { payload, user } = await requireUser()
  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE
  const rows = parseCsvRows(csvText)

  const result = await runCsvImport(rows, async (row) => {
    if (!row.name) throw new Error(t(locale, 'programs.validationNameRequired'))

    const soort = row.soort ? row.soort.toLowerCase() : undefined
    if (soort && !SOORT_OPTIONS.includes(soort as (typeof SOORT_OPTIONS)[number])) {
      throw new Error(t(locale, 'csvImport.invalidSoort'))
    }

    const defaultLessonCount = parseCsvNumber(row.defaultLessonCount)
    if (defaultLessonCount === 'invalid') {
      throw new Error(t(locale, 'csvImport.invalidNumber', { field: 'defaultLessonCount' }))
    }
    const defaultLessonDurationMinutes = parseCsvNumber(row.defaultLessonDurationMinutes)
    if (defaultLessonDurationMinutes === 'invalid') {
      throw new Error(t(locale, 'csvImport.invalidNumber', { field: 'defaultLessonDurationMinutes' }))
    }
    const price = parseCsvNumber(row.price)
    if (price === 'invalid') {
      throw new Error(t(locale, 'csvImport.invalidNumber', { field: 'price' }))
    }

    const active = parseCsvBoolean(row.active, true)
    if (active === 'invalid') {
      throw new Error(t(locale, 'csvImport.invalidBoolean', { field: 'active' }))
    }

    try {
      await payload.create({
        collection: 'programs',
        data: {
          name: row.name,
          description: row.description || undefined,
          soort: soort as Program['soort'],
          defaultLessonCount,
          defaultLessonDurationMinutes,
          price,
          active,
        },
        user,
        overrideAccess: false,
      })
    } catch (err) {
      if (isUniqueFieldViolation(err, 'name')) {
        throw new Error(t(locale, 'programs.duplicateName', { name: row.name }))
      }
      throw err
    }
  })

  revalidatePath('/programs')
  return result
}

export async function deleteProgram(id: number): Promise<ActionResult> {
  return deletePrograms([id])
}

/**
 * Deletes every listed Program, cascading their Bookings (and those
 * Bookings' Lessons) and Lesson Templates first — see deleteCascade.ts
 * for why that's necessary rather than a single `payload.delete`. Used
 * by both the single "Remove" action and the Programs list's
 * bulk-delete.
 */
export async function deletePrograms(ids: number[]): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await deleteBookingsCascade(payload, user, { program: { in: ids } })
    await payload.delete({
      collection: 'lesson-templates',
      where: { program: { in: ids } },
      user,
      overrideAccess: false,
    })
    await payload.delete({ collection: 'programs', where: { id: { in: ids } }, user, overrideAccess: false })
    revalidatePath('/programs')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove programs'
    return { success: false, error: message }
  }
}

export type LessonTemplateInput = {
  durationMinutes?: number
  defaultTeacher?: number | null
}

export async function createLessonTemplate(programId: number, data: LessonTemplateInput): Promise<CreateResult> {
  const { payload, user } = await requireUser()

  try {
    const existing = await payload.find({
      collection: 'lesson-templates',
      where: { program: { equals: programId } },
      sort: '-sequenceNo',
      limit: 1,
      overrideAccess: false,
      user,
    })
    const nextSequenceNo = (existing.docs[0]?.sequenceNo ?? 0) + 1

    const template = await payload.create({
      collection: 'lesson-templates',
      data: {
        program: programId,
        sequenceNo: nextSequenceNo,
        durationMinutes: data.durationMinutes,
        defaultTeacher: data.defaultTeacher ?? undefined,
      },
      user,
      overrideAccess: false,
    })
    revalidatePath(`/programs/${programId}`)
    return { success: true, id: Number(template.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add lesson template'
    return { success: false, error: message }
  }
}

export async function deleteLessonTemplate(id: number, programId: number): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.delete({ collection: 'lesson-templates', id, user, overrideAccess: false })
    revalidatePath(`/programs/${programId}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove lesson template'
    return { success: false, error: message }
  }
}
