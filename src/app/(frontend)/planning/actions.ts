'use server'

import { headers as getHeaders } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import config from '@/payload.config'
import type { Booking, Lesson } from '@/payload-types'

/**
 * Every action re-checks auth itself and passes `overrideAccess: false` with
 * the resolved user — Payload's Local API bypasses collection access control
 * by default, so skipping this would let an unauthenticated request through
 * regardless of the page-level redirect in page.tsx.
 */
async function requireUser() {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })
  if (!user) {
    throw new Error('Not authenticated')
  }
  return { payload, user }
}

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

export type CreateBookingResult = { success: true; id: number } | { success: false; error: string }

/**
 * Booking a school onto a program is the trigger for lesson generation
 * (see src/hooks/generateLessonsFromBooking.ts) — this is the one create
 * path the planning UI needs, since everything else (schools, teachers,
 * programs, lesson templates) is genuinely admin/config work, not a
 * regular user's daily task the way booking a program onto a school is.
 */
export async function createBooking(input: BookingCreateInput): Promise<CreateBookingResult> {
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
