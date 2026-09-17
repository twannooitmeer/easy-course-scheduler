import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '../../src/payload.config'

/**
 * Proves the actual wiring, through the real Payload/Postgres local API:
 * a status change on a Booking or Lesson reaches notifyOnBookingStatusChange
 * / notifyOnLessonStatusChange (statusChangeHooks.ts), and with no
 * RESEND_API_KEY/EMAIL_FROM configured -- the state of this repo's own
 * .env.example and every CI run -- it logs instead of making any network
 * call. getNotificationSender.spec coverage in notifications.int.spec.ts
 * already proves the sender-selection logic in isolation; this proves the
 * collection hooks actually call it on a real status transition.
 *
 * Requires a reachable Postgres (the docker-compose `postgres` service).
 */
describe('status-change notification hooks', () => {
  let payload: Payload
  const originalApiKey = process.env.RESEND_API_KEY
  const originalFrom = process.env.EMAIL_FROM
  const originalFetch = global.fetch

  beforeAll(async () => {
    payload = await getPayload({ config })
    // Full, dependency-ordered cleanup (children before the parents they
    // reference). Spec files run in a fixed order against the same dev
    // database (`fileParallelism: false` in vitest.config.mts), so a leftover
    // Closure row from another spec must not block Schools here either. See
    // legacyImport.int.spec.ts's SHARED_COLLECTIONS_CLEANUP_ORDER doc comment
    // for the full explanation.
    for (const collection of [
      'closures',
      'lessons',
      'bookings',
      'lesson-templates',
      'programs',
      'teachers',
      'contacts',
      'schools',
    ] as const) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
  })

  afterAll(async () => {
    await payload.destroy()
  })

  beforeEach(() => {
    // The whole point of this suite: prove the no-key path, which is what
    // every dev machine and CI run actually has (see .env.example).
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
  })

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = originalApiKey
    if (originalFrom === undefined) delete process.env.EMAIL_FROM
    else process.env.EMAIL_FROM = originalFrom
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('a Booking status change with no Resend key sends nothing and logs instead', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const infoSpy = vi.spyOn(payload.logger, 'info')

    const school = await payload.create({ collection: 'schools', data: { name: 'Notify Test School' } })
    await payload.create({
      collection: 'contacts',
      data: { fullName: 'Notify Test Contact', email: 'contact@example.test', school: school.id },
    })
    const program = await payload.create({ collection: 'programs', data: { name: 'Notify Test Program' } })
    const booking = await payload.create({
      collection: 'bookings',
      data: { school: school.id, program: program.id, startDate: '2026-09-01T00:00:00.000Z', status: 'nieuw' },
    })

    await payload.update({ collection: 'bookings', id: booking.id, data: { status: 'akkoord_docent' } })

    expect(fetchMock).not.toHaveBeenCalled()
    const loggedLocalNotice = infoSpy.mock.calls.some(
      (call) => typeof call[0] === 'string' && call[0].includes('no RESEND_API_KEY'),
    )
    expect(loggedLocalNotice).toBe(true)
  })

  it('a Lesson status change with no Resend key sends nothing and logs instead', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const infoSpy = vi.spyOn(payload.logger, 'info')

    const teacher = await payload.create({
      collection: 'teachers',
      data: { displayName: 'Notify Test Teacher', kind: 'person', email: 'teacher@example.test' },
    })
    const school = await payload.create({ collection: 'schools', data: { name: 'Notify Lesson School' } })
    const program = await payload.create({ collection: 'programs', data: { name: 'Notify Lesson Program' } })
    await payload.create({
      collection: 'lesson-templates',
      data: { program: program.id, sequenceNo: 1, defaultTeacher: teacher.id },
    })
    const booking = await payload.create({
      collection: 'bookings',
      data: { school: school.id, program: program.id, startDate: '2026-09-01T00:00:00.000Z', status: 'nieuw' },
    })

    const lessons = await payload.find({ collection: 'lessons', where: { booking: { equals: booking.id } }, depth: 0 })
    expect(lessons.totalDocs).toBe(1)
    const lesson = lessons.docs[0]

    await payload.update({ collection: 'lessons', id: lesson.id, data: { status: 'akkoord_school' } })

    expect(fetchMock).not.toHaveBeenCalled()
    const loggedLocalNotice = infoSpy.mock.calls.some(
      (call) => typeof call[0] === 'string' && call[0].includes('no RESEND_API_KEY'),
    )
    expect(loggedLocalNotice).toBe(true)
  })

  it('does not fire on create, and does not fire again when the status is unchanged', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const infoSpy = vi.spyOn(payload.logger, 'info')

    const school = await payload.create({ collection: 'schools', data: { name: 'Notify No-op School' } })
    const program = await payload.create({ collection: 'programs', data: { name: 'Notify No-op Program' } })
    const booking = await payload.create({
      collection: 'bookings',
      data: { school: school.id, program: program.id, startDate: '2026-09-01T00:00:00.000Z', status: 'nieuw' },
    })

    // Update a different field, same status -- no transition, so no notification attempt at all.
    await payload.update({ collection: 'bookings', id: booking.id, data: { note: 'just a note' } })

    expect(fetchMock).not.toHaveBeenCalled()
    const loggedLocalNotice = infoSpy.mock.calls.some(
      (call) => typeof call[0] === 'string' && call[0].includes('no RESEND_API_KEY'),
    )
    expect(loggedLocalNotice).toBe(false)
  })

  it('honours req.context.skipNotification (used by the legacy import script to avoid a bulk-update email storm)', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const infoSpy = vi.spyOn(payload.logger, 'info')

    const school = await payload.create({ collection: 'schools', data: { name: 'Notify Skip School' } })
    const program = await payload.create({ collection: 'programs', data: { name: 'Notify Skip Program' } })
    const booking = await payload.create({
      collection: 'bookings',
      data: { school: school.id, program: program.id, startDate: '2026-09-01T00:00:00.000Z', status: 'nieuw' },
    })

    await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { status: 'akkoord_school' },
      context: { skipNotification: true },
    })

    expect(fetchMock).not.toHaveBeenCalled()
    const loggedLocalNotice = infoSpy.mock.calls.some(
      (call) => typeof call[0] === 'string' && call[0].includes('no RESEND_API_KEY'),
    )
    expect(loggedLocalNotice).toBe(false)
  })
})
