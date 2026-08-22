'use server'

import { revalidatePath } from 'next/cache'

import type { Program } from '@/payload-types'
import { requireUser } from '../requireUser'

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

  try {
    if (!data.name?.trim()) throw new Error('Name is required.')
    const program = await payload.create({
      collection: 'programs',
      data: { name: data.name, soort: data.soort },
      user,
      overrideAccess: false,
    })
    revalidatePath('/programs')
    return { success: true, id: Number(program.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create program'
    return { success: false, error: message }
  }
}

export async function updateProgram(id: number, data: ProgramInput): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.update({ collection: 'programs', id, data, user, overrideAccess: false })
    revalidatePath('/programs')
    revalidatePath(`/programs/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save program'
    return { success: false, error: message }
  }
}

export async function deleteProgram(id: number): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.delete({ collection: 'programs', id, user, overrideAccess: false })
    revalidatePath('/programs')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove program'
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
