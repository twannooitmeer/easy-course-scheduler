import path from 'node:path'

import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'
import { runLegacyImport } from '../../scripts/legacy-import/importer'
import { parseWorkbook } from '../../scripts/legacy-import/parseWorkbook'
import type { LegacyImportConfig } from '../../scripts/legacy-import/types'

/**
 * End-to-end coverage of the legacy-spreadsheet import against a real
 * Payload/Postgres instance, using the synthetic fixtures in
 * scripts/legacy-import/fixtures/ (a fully worked, made-up deployment: no
 * real school, teacher, or organisation name appears anywhere in this
 * file). See scripts/legacy-import/README.md for the full behaviour this
 * exercises.
 *
 * Requires a reachable Postgres (the docker-compose `postgres` service).
 * Run `docker compose up -d postgres` first, then `pnpm test`.
 *
 * Runs against that same dev database rather than a disposable one, so
 * `beforeAll` clears every collection this suite touches first, same as
 * the other int specs in this directory.
 */

const fixtureConfig: LegacyImportConfig = {
  deploymentLabel: 'Example Deployment 2026-2027',
  columns: {
    school: 'School',
    teachers: 'Docent',
    program: 'Programma',
    lessonDate: 'Datum',
    groupLabel: 'Groep',
    status: 'Status',
    soort: 'Soort',
    startTime: 'Starttijd',
    endTime: 'Eindtijd',
    location: 'Locatie',
    studentCount: 'Aantal leerlingen',
    remark: 'Opmerking',
  },
  teacherSeparator: ' en ',
  organisationTeacherNames: ['Voorbeeld Cultuurhuis'],
  statusMap: {
    nieuw: 'nieuw',
    aangevraagd: 'aangevraagd_docent',
    'akkoord docent': 'akkoord_docent',
    'akkoord school': 'akkoord_school',
  },
  soortMap: {
    regulier: 'regulier',
    maatwerk: 'maatwerk',
  },
  closureKeywords: ['studiedag', 'vakantie'],
  defaultCountry: 'Nederland',
}

/**
 * Every int spec in this directory runs its own cleanup against the same
 * shared dev database, and several of Payload's own relationship fields are
 * `required: true` NOT NULL foreign keys (see deleteCascade.int.spec.ts's
 * doc comment): Bookings/Closures/Contacts each require a School, and
 * Bookings/LessonTemplates each require a Program. Deleting a School or
 * Program while any of those still reference it aborts the whole cleanup
 * transaction with a Postgres foreign-key violation, which then surfaces as
 * a generic "current transaction is aborted" error on whatever unrelated
 * query happens to run next. This full, dependency-ordered list (children
 * before the parents they point at) is what every spec that touches
 * Schools/Teachers/Programs should clean with, regardless of which other
 * spec ran immediately before it.
 */
const SHARED_COLLECTIONS_CLEANUP_ORDER = [
  'closures',
  'lessons',
  'bookings',
  'lesson-templates',
  'contacts',
  'schools',
  'teachers',
  'programs',
] as const

const fixturePath = path.resolve(import.meta.dirname, '../../scripts/legacy-import/fixtures/example-source.csv')
const updatedFixturePath = path.resolve(
  import.meta.dirname,
  '../../scripts/legacy-import/fixtures/example-source-updated.csv',
)

describe('Legacy spreadsheet import (runLegacyImport)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
    for (const collection of SHARED_COLLECTIONS_CLEANUP_ORDER) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
  })

  afterAll(async () => {
    // Unlike most other int specs (which only clean up in their own
    // beforeAll, relying on the next file's beforeAll to clear their
    // leftovers), this suite also cleans up fully here: with `fileParallelism:
    // false` (vitest.config.mts), spec files now run in a fixed order against
    // the same dev database, so any collection this suite writes to and no
    // other spec's own cleanup list happens to include (Closures, in
    // particular) would otherwise sit there referencing a School/Program that
    // a later spec's own cleanup can't remove, aborting that spec's
    // transaction with a foreign-key violation.
    for (const collection of SHARED_COLLECTIONS_CLEANUP_ORDER) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
    await payload.destroy()
  })

  it('dry run reports the expected change set and writes nothing', async () => {
    const rows = parseWorkbook(fixturePath)
    const report = await runLegacyImport(payload, fixtureConfig, rows, { commit: false })

    expect(report.committed).toBe(false)
    expect(report.totalRows).toBe(7)
    expect(report.schoolsToCreate.sort()).toEqual(['Voorbeeldschool Noord', 'Voorbeeldschool Zuid'])
    expect(report.teachersToCreate.sort()).toEqual(['Bakker', 'De Vries', 'Jansen', 'Voorbeeld Cultuurhuis'])
    expect(report.programsToCreate.sort()).toEqual(['Lentekriebels', 'Wintermuziek'])
    expect(report.bookingsToCreate).toBe(2)
    expect(report.closuresToCreate).toBe(1)
    expect(report.lessonsToCreate).toBe(4)
    expect(report.lessonsUnchanged).toBe(0)
    expect(report.lessonsToUpdate).toEqual([])
    expect(report.rowErrors).toHaveLength(2)
    expect(report.rowErrors.map((e) => e.row)).toEqual([7, 8])
    expect(report.rowErrors[0].error).toContain('missing a value in the school column')
    expect(report.rowErrors[1].error).toContain('unrecognized status')

    // A dry run must never write anything.
    for (const collection of ['closures', 'lessons', 'bookings', 'schools', 'teachers', 'programs'] as const) {
      const found = await payload.find({ collection, limit: 1, depth: 0 })
      expect(found.totalDocs).toBe(0)
    }
  })

  it('committing creates every entity, sets importRef, and resolves organisation vs. person teachers', async () => {
    const rows = parseWorkbook(fixturePath)
    const report = await runLegacyImport(payload, fixtureConfig, rows, { commit: true })

    expect(report.committed).toBe(true)
    expect(report.schoolsToCreate).toHaveLength(2)
    expect(report.teachersToCreate).toHaveLength(4)
    expect(report.programsToCreate).toHaveLength(2)
    expect(report.bookingsToCreate).toBe(2)
    expect(report.closuresToCreate).toBe(1)
    expect(report.lessonsToCreate).toBe(4)

    const schools = await payload.find({ collection: 'schools', depth: 0 })
    expect(schools.totalDocs).toBe(2)
    const noord = schools.docs.find((s) => s.name === 'Voorbeeldschool Noord')
    expect(noord).toBeDefined()
    expect(noord?.country).toBe('Nederland')

    const teachers = await payload.find({ collection: 'teachers', depth: 0 })
    expect(teachers.totalDocs).toBe(4)
    const jansen = teachers.docs.find((t) => t.displayName === 'Jansen')
    expect(jansen?.kind).toBe('person')
    const cultuurhuis = teachers.docs.find((t) => t.displayName === 'Voorbeeld Cultuurhuis')
    expect(cultuurhuis?.kind).toBe('organisation')

    const programs = await payload.find({ collection: 'programs', depth: 0 })
    expect(programs.totalDocs).toBe(2)

    const bookings = await payload.find({ collection: 'bookings', depth: 0 })
    expect(bookings.totalDocs).toBe(2)
    for (const booking of bookings.docs) {
      expect(booking.importRef).toBeTruthy()
    }

    const lessons = await payload.find({ collection: 'lessons', sort: 'sequenceNo', depth: 0 })
    expect(lessons.totalDocs).toBe(4)
    for (const lesson of lessons.docs) {
      expect(lesson.importRef).toBeTruthy()
    }

    const closures = await payload.find({ collection: 'closures', depth: 0 })
    expect(closures.totalDocs).toBe(1)
    expect(closures.docs[0].label).toBe('Studiedag hele school')
    expect(closures.docs[0].importRef).toBeTruthy()
  })

  it('re-running the same commit against the same file is a no-op: no duplicates, nothing unchanged flagged as a change', async () => {
    const rows = parseWorkbook(fixturePath)
    const report = await runLegacyImport(payload, fixtureConfig, rows, { commit: true })

    expect(report.schoolsToCreate).toEqual([])
    expect(report.teachersToCreate).toEqual([])
    expect(report.programsToCreate).toEqual([])
    expect(report.bookingsToCreate).toBe(0)
    expect(report.closuresToCreate).toBe(0)
    expect(report.lessonsToCreate).toBe(0)
    expect(report.lessonsUnchanged).toBe(4)
    expect(report.lessonsToUpdate).toEqual([])
    expect(report.rowErrors).toHaveLength(2)

    // Still exactly the same number of rows in the database -- nothing duplicated.
    expect((await payload.find({ collection: 'schools', limit: 0 })).totalDocs).toBe(2)
    expect((await payload.find({ collection: 'teachers', limit: 0 })).totalDocs).toBe(4)
    expect((await payload.find({ collection: 'programs', limit: 0 })).totalDocs).toBe(2)
    expect((await payload.find({ collection: 'bookings', limit: 0 })).totalDocs).toBe(2)
    expect((await payload.find({ collection: 'lessons', limit: 0 })).totalDocs).toBe(4)
    expect((await payload.find({ collection: 'closures', limit: 0 })).totalDocs).toBe(1)
  })

  it('re-running against an updated export only updates the one lesson that actually changed', async () => {
    const rows = parseWorkbook(updatedFixturePath)
    const report = await runLegacyImport(payload, fixtureConfig, rows, { commit: true })

    expect(report.schoolsToCreate).toEqual([])
    expect(report.bookingsToCreate).toBe(0)
    expect(report.closuresToCreate).toBe(0)
    expect(report.lessonsToCreate).toBe(0)
    expect(report.lessonsUnchanged).toBe(3)
    expect(report.lessonsToUpdate).toHaveLength(1)

    const change = report.lessonsToUpdate[0]
    expect(change.school).toBe('Voorbeeldschool Noord')
    expect(change.program).toBe('Lentekriebels')
    expect(change.sequenceNo).toBe(1)
    expect(change.fields.sort()).toEqual(['status', 'studentCount'])

    // No duplicate lesson/booking was created for the changed row.
    expect((await payload.find({ collection: 'bookings', limit: 0 })).totalDocs).toBe(2)
    expect((await payload.find({ collection: 'lessons', limit: 0 })).totalDocs).toBe(4)

    const updatedLesson = await payload.find({
      collection: 'lessons',
      where: { and: [{ sequenceNo: { equals: 1 } }, { lessonDate: { equals: '2026-09-01T00:00:00.000Z' } }] },
      depth: 0,
    })
    expect(updatedLesson.docs[0]?.status).toBe('akkoord_school')
    expect(updatedLesson.docs[0]?.studentCount).toBe(26)
  })
})
