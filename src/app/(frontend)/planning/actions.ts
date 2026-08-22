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
