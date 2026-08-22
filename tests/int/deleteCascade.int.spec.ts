import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'
import type { User } from '../../src/payload-types'
import { deleteBookingsCascade } from '../../src/app/(frontend)/deleteCascade'

/**
 * Real bug this guards against: Payload generates every relationship FK
 * as `ON DELETE SET NULL`, but Bookings.school/Bookings.program are
 * `required: true` (NOT NULL columns) — deleting a School or Program
 * with any bookings still attached threw a raw Postgres constraint
 * violation before deleteCascade.ts existed. Confirmed live against
 * Postgres directly before this fix: `DELETE FROM schools WHERE id = ...`
 * with a dependent contact/booking failed with "null value in column
 * "school_id" ... violates not-null constraint".
 */
describe('deleteBookingsCascade', () => {
  let payload: Payload
  let user: User

  beforeAll(async () => {
    payload = await getPayload({ config })
    for (const collection of ['lessons', 'bookings', 'lesson-templates', 'programs', 'schools'] as const) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
    const users = await payload.find({ collection: 'users', limit: 1 })
    user =
      users.docs[0] ??
      (await payload.create({
        collection: 'users',
        data: {
          email: 'int-delete-cascade@example.com',
          password: 'int-delete-cascade-password-123',
          name: 'Int Delete Cascade User',
          role: 'admin',
          preferredLanguage: 'en',
        },
      }))
  })

  afterAll(async () => {
    await payload.destroy()
  })

  it('deletes every booking (and its lessons) matching the where clause, leaving others untouched', async () => {
    const program = await payload.create({
      collection: 'programs',
      data: { name: 'Cascade Test Program' },
    })
    await payload.create({
      collection: 'lesson-templates',
      data: { program: program.id, sequenceNo: 1 },
    })

    const schoolToDelete = await payload.create({
      collection: 'schools',
      data: { name: 'Cascade Test School (deleted)' },
    })
    const otherSchool = await payload.create({
      collection: 'schools',
      data: { name: 'Cascade Test School (kept)' },
    })

    const bookingToDelete = await payload.create({
      collection: 'bookings',
      data: {
        school: schoolToDelete.id,
        program: program.id,
        startDate: '2026-09-01T00:00:00.000Z',
        status: 'nieuw',
      },
    })
    const bookingToKeep = await payload.create({
      collection: 'bookings',
      data: {
        school: otherSchool.id,
        program: program.id,
        startDate: '2026-09-01T00:00:00.000Z',
        status: 'nieuw',
      },
    })

    await deleteBookingsCascade(payload, user, { school: { equals: schoolToDelete.id } })

    // Scoped to this test's own fixtures rather than the whole table --
    // this suite shares a real dev Postgres with the other int specs,
    // which run their own bookings concurrently.
    const deletedBookingStillExists = await payload
      .findByID({ collection: 'bookings', id: bookingToDelete.id, depth: 0 })
      .then(() => true)
      .catch(() => false)
    expect(deletedBookingStillExists).toBe(false)

    const keptBooking = await payload.findByID({ collection: 'bookings', id: bookingToKeep.id, depth: 0 })
    expect(keptBooking.id).toBe(bookingToKeep.id)

    const remainingLessons = await payload.find({
      collection: 'lessons',
      where: { booking: { equals: bookingToDelete.id } },
      depth: 0,
    })
    expect(remainingLessons.totalDocs).toBe(0)

    const keptLessons = await payload.find({
      collection: 'lessons',
      where: { booking: { equals: bookingToKeep.id } },
      depth: 0,
    })
    expect(keptLessons.totalDocs).toBe(1)

    // The actual regression this guards: deleting a School with a
    // booking still attached must not throw the FK constraint violation
    // once its bookings are cascaded away first.
    await expect(
      payload.delete({ collection: 'schools', id: schoolToDelete.id, user, overrideAccess: false }),
    ).resolves.not.toThrow()
  })

  it('is a no-op when nothing matches the where clause', async () => {
    await expect(
      deleteBookingsCascade(payload, user, { school: { equals: 999999 } }),
    ).resolves.not.toThrow()
  })
})
