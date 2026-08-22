import type { Payload, Where } from 'payload'

import type { User } from '@/payload-types'

/**
 * Deletes every Booking matching `where` (and their Lessons first) —
 * shared by School and Program bulk/single delete, since both are
 * "delete this record, and every booking that points at it" with the
 * only difference being which field the where-clause is scoped on.
 *
 * Real DB constraint this works around: Payload generates every
 * relationship FK as `ON DELETE SET NULL`, but Bookings.school and
 * Bookings.program are `required: true` (NOT NULL columns) — deleting
 * a School or Program with any bookings still attached would otherwise
 * throw a raw Postgres constraint violation instead of a clean delete.
 * There's no DB-level cascade configured (see Bookings.ts's own
 * comment), so dependents are deleted explicitly, same as the existing
 * single-booking delete already does for its lessons.
 */
export async function deleteBookingsCascade(payload: Payload, user: User, where: Where): Promise<void> {
  const bookings = await payload.find({
    collection: 'bookings',
    where,
    limit: 5000,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const bookingIds = bookings.docs.map((booking) => booking.id)
  if (bookingIds.length === 0) return

  await payload.delete({
    collection: 'lessons',
    where: { booking: { in: bookingIds } },
    user,
    overrideAccess: false,
  })
  await payload.delete({
    collection: 'bookings',
    where: { id: { in: bookingIds } },
    user,
    overrideAccess: false,
  })
}
