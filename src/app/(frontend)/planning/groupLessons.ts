import type { Booking, Lesson } from '@/payload-types'
import type { BookingWithLessons } from './types'

/**
 * A relationship field's value is the raw ID only when the query used
 * `depth: 0`; at `depth: 1` (needed here so teachers/school/program render
 * without a second round-trip) it arrives already populated as an object.
 * Same shape of bug this app already hit once in the lesson-generation hook.
 */
export function relationId(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    return Number((value as { id: number | string }).id)
  }
  return Number(value)
}

/**
 * Attaches each Lesson to its Booking and sorts lessons within a booking by
 * sequence number, so the planning grid's expanded panel always reads in
 * lesson order regardless of what order they came back from the query in.
 */
export function groupLessonsByBooking(bookings: Booking[], lessons: Lesson[]): BookingWithLessons[] {
  const byBooking = new Map<number, Lesson[]>()
  for (const lesson of lessons) {
    const bookingId = relationId(lesson.booking)
    if (bookingId === null) continue
    const existing = byBooking.get(bookingId) ?? []
    existing.push(lesson)
    byBooking.set(bookingId, existing)
  }

  return bookings.map((booking) => ({
    ...booking,
    lessons: (byBooking.get(Number(booking.id)) ?? []).slice().sort((a, b) => a.sequenceNo - b.sequenceNo),
  }))
}
