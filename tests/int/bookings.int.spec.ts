import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

/**
 * Covers the one piece of real business logic the MVP scaffold has: booking
 * a school onto a program must generate one Lesson per LessonTemplate,
 * correctly sequenced, dated, and teacher-assigned — and must NOT regenerate
 * or duplicate lessons on a later update of the same booking.
 *
 * Requires a reachable Postgres (the docker-compose `postgres` service).
 * Run `docker compose up -d postgres` first, then `pnpm test`.
 *
 * Runs against that same dev database rather than a disposable one, so
 * `beforeAll` clears every collection this suite touches first — otherwise
 * a second run collides with the first's rows on the `unique: true` name
 * fields (school/teacher/program names), which is exactly what happened
 * the first time this was run twice in a row.
 */
describe('Bookings: generateLessonsFromBooking', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
    // Full, dependency-ordered cleanup (children before the parents they
    // reference). Spec files now run in a fixed order against the same dev
    // database (`fileParallelism: false` in vitest.config.mts), so a leftover
    // row from any other spec's Closures/Contacts/LessonTemplates would
    // otherwise block deleting the Schools/Programs below it and abort this
    // whole cleanup with a Postgres foreign-key violation. See
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

  it('generates one lesson per lesson template, in sequence, dated a week apart', async () => {
    const teacher = await payload.create({
      collection: 'teachers',
      data: { displayName: 'Test Teacher', kind: 'person' },
    })

    const program = await payload.create({
      collection: 'programs',
      data: { name: 'Test Program', soort: 'regulier' },
    })

    await payload.create({
      collection: 'lesson-templates',
      data: { program: program.id, sequenceNo: 1, defaultTeacher: teacher.id },
    })
    await payload.create({
      collection: 'lesson-templates',
      data: { program: program.id, sequenceNo: 2, defaultTeacher: teacher.id },
    })

    const school = await payload.create({
      collection: 'schools',
      data: { name: 'Test School' },
    })

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        school: school.id,
        program: program.id,
        groupLabel: '3a',
        startDate: '2026-09-01T00:00:00.000Z',
        status: 'nieuw',
      },
    })

    const lessons = await payload.find({
      collection: 'lessons',
      where: { booking: { equals: booking.id } },
      sort: 'sequenceNo',
      depth: 0,
    })

    expect(lessons.totalDocs).toBe(2)

    const [first, second] = lessons.docs
    expect(first.sequenceNo).toBe(1)
    expect(first.lessonDate).toBe('2026-09-01T00:00:00.000Z')
    expect(first.groupLabel).toBe('3a')
    expect(first.teachers).toEqual([teacher.id])
    expect(first.status).toBe('nieuw')

    expect(second.sequenceNo).toBe(2)
    expect(second.lessonDate).toBe('2026-09-08T00:00:00.000Z')
  })

  it('does not regenerate lessons when the booking is later updated', async () => {
    const program = await payload.create({
      collection: 'programs',
      data: { name: 'Single-Lesson Program' },
    })
    await payload.create({
      collection: 'lesson-templates',
      data: { program: program.id, sequenceNo: 1 },
    })
    const school = await payload.create({
      collection: 'schools',
      data: { name: 'Another Test School' },
    })

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        school: school.id,
        program: program.id,
        startDate: '2026-10-01T00:00:00.000Z',
        status: 'nieuw',
      },
    })

    await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { status: 'akkoord_school' },
    })

    const lessons = await payload.find({
      collection: 'lessons',
      where: { booking: { equals: booking.id } },
      depth: 0,
    })

    expect(lessons.totalDocs).toBe(1)
  })

  it('leaves a booking with no matching lesson templates with zero lessons, no error', async () => {
    const program = await payload.create({
      collection: 'programs',
      data: { name: 'Templateless Program' },
    })
    const school = await payload.create({
      collection: 'schools',
      data: { name: 'Templateless School' },
    })

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        school: school.id,
        program: program.id,
        startDate: '2026-11-01T00:00:00.000Z',
        status: 'nieuw',
      },
    })

    const lessons = await payload.find({
      collection: 'lessons',
      where: { booking: { equals: booking.id } },
      depth: 0,
    })

    expect(lessons.totalDocs).toBe(0)
  })
})
