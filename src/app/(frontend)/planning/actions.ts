'use server'

import { revalidatePath } from 'next/cache'

import type { Booking, Lesson } from '@/payload-types'
import { requireUser } from '../requireUser'

export type LessonUpdateInput = Partial<
  Pick<
    Lesson,
    | 'lessonDate'
    | 'startTime'
    | 'endTime'
    | 'groupLabel'
    | 'teachers'
    | 'location'
    | 'studentCount'
    | 'status'
    | 'soortOverride'
    | 'remark'
  >
>

export async function updateLesson(id: number, data: LessonUpdateInput) {
  const { payload, user } = await requireUser()

  await payload.update({
    collection: 'lessons',
    id,
    data,
    user,
    overrideAccess: false,
  })

  revalidatePath('/planning')
}

export type BookingUpdateInput = Partial<Pick<Booking, 'groupLabel' | 'startDate' | 'status' | 'note'>>

export async function updateBooking(id: number, data: BookingUpdateInput) {
  const { payload, user } = await requireUser()

  await payload.update({
    collection: 'bookings',
    id,
    data,
    user,
    overrideAccess: false,
  })

  revalidatePath('/planning')
}

export type BookingCreateInput = {
  school: number
  program: number
  groupLabel?: string
  startDate: string
}

export type CreateResult = { success: true; id: number } | { success: false; error: string }
export type ActionResult = { success: true } | { success: false; error: string }

/**
 * Booking a school onto a program is the trigger for lesson generation
 * (see src/hooks/generateLessonsFromBooking.ts).
 */
export async function createBooking(input: BookingCreateInput): Promise<CreateResult> {
  const { payload, user } = await requireUser()

  try {
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        school: input.school,
        program: input.program,
        groupLabel: input.groupLabel || undefined,
        startDate: input.startDate,
        status: 'nieuw',
      },
      user,
      overrideAccess: false,
    })

    revalidatePath('/planning')
    return { success: true, id: Number(booking.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create booking'
    return { success: false, error: message }
  }
}

/**
 * A lesson added directly from the grid (not generated from a template) —
 * e.g. a makeup lesson a booking's program didn't originally call for.
 * Starts mostly blank; sequenceNo continues after whatever's already there
 * so it sorts to the end, and every other field is edited inline afterward
 * through the same cells an auto-generated lesson uses.
 */
export async function createLesson(bookingId: number): Promise<CreateResult> {
  const { payload, user } = await requireUser()

  try {
    const existing = await payload.find({
      collection: 'lessons',
      where: { booking: { equals: bookingId } },
      sort: '-sequenceNo',
      limit: 1,
      depth: 0,
    })
    const nextSequenceNo = (existing.docs[0]?.sequenceNo ?? 0) + 1

    const lesson = await payload.create({
      collection: 'lessons',
      data: {
        booking: bookingId,
        sequenceNo: nextSequenceNo,
        lessonDate: new Date().toISOString(),
        status: 'nieuw',
      },
      user,
      overrideAccess: false,
    })

    revalidatePath('/planning')
    return { success: true, id: Number(lesson.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add lesson'
    return { success: false, error: message }
  }
}

export async function deleteLesson(id: number): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.delete({
      collection: 'lessons',
      id,
      user,
      overrideAccess: false,
    })

    revalidatePath('/planning')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove lesson'
    return { success: false, error: message }
  }
}

/**
 * Deletes the booking and every lesson generated under it -- there's no DB
 * cascade set up (see the collections' own comments on why relationships
 * stay simple for this data volume), so the lessons are deleted explicitly
 * first, in the same order the vitest fixtures already clean up after
 * themselves.
 */
export async function deleteBooking(id: number): Promise<ActionResult> {
  const { payload, user } = await requireUser()

  try {
    await payload.delete({
      collection: 'lessons',
      where: { booking: { equals: id } },
      user,
      overrideAccess: false,
    })
    await payload.delete({
      collection: 'bookings',
      id,
      user,
      overrideAccess: false,
    })

    revalidatePath('/planning')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove booking'
    return { success: false, error: message }
  }
}
