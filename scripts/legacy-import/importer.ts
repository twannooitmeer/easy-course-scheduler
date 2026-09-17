import type { Payload } from 'payload'

import type { Lesson } from '../../src/payload-types'
import { bookingKey, closureKey, isOrganisationTeacher, lessonKey, rowIdKey } from './normalize'
import { mapRow, type MappedLessonRow } from './mapRow'
import type { LegacyImportConfig } from './types'

export type RowError = { row: number; error: string }

export type LessonChange = { importRef: string; school: string; program: string; sequenceNo: number; fields: string[] }

export type ImportReport = {
  deploymentLabel: string
  committed: boolean
  totalRows: number
  schoolsToCreate: string[]
  teachersToCreate: string[]
  programsToCreate: string[]
  bookingsToCreate: number
  closuresToCreate: number
  lessonsToCreate: number
  lessonsToUpdate: LessonChange[]
  lessonsUnchanged: number
  rowErrors: RowError[]
}

type NameCache = Map<string, { id: number } | null>

/** Create-or-find by a unique `name`/`displayName` field, memoized per run so a repeated name is resolved once. */
async function resolveNamedEntity(
  payload: Payload,
  collection: 'schools' | 'teachers' | 'programs',
  nameField: 'name' | 'displayName',
  name: string,
  extraData: Record<string, unknown>,
  cache: NameCache,
  toCreate: string[],
  commit: boolean,
): Promise<{ id: number } | null> {
  const key = name.toLowerCase()
  if (cache.has(key)) return cache.get(key) ?? null

  const existing = await payload.find({
    collection,
    where: { [nameField]: { equals: name } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs[0]) {
    const doc = { id: Number(existing.docs[0].id) }
    cache.set(key, doc)
    return doc
  }

  toCreate.push(name)

  if (!commit) {
    cache.set(key, null)
    return null
  }

  // `collection` is a union of three slugs here (this one helper serves
  // Schools/Teachers/Programs alike), which Payload's local-API generics
  // can't narrow the way a literal slug would -- the cast is the pragmatic
  // fix for a genuinely dynamic-collection call site.
  const created = await payload.create({
    collection,
    data: { [nameField]: name, ...extraData },
    overrideAccess: true,
  } as Parameters<typeof payload.create>[0])
  const doc = { id: Number(created.id) }
  cache.set(key, doc)
  return doc
}

function lessonNeedsUpdate(
  existing: Lesson,
  desired: {
    lessonDate: string
    startTime?: string
    endTime?: string
    groupLabel?: string
    teacherIds: number[]
    location?: string
    studentCount?: number
    status: string
    soortOverride?: string
    remark?: string
  },
): string[] {
  const changed: string[] = []
  if (existing.lessonDate !== desired.lessonDate) changed.push('lessonDate')
  if ((existing.startTime ?? undefined) !== desired.startTime) changed.push('startTime')
  if ((existing.endTime ?? undefined) !== desired.endTime) changed.push('endTime')
  if ((existing.groupLabel ?? '') !== (desired.groupLabel ?? '')) changed.push('groupLabel')

  const existingTeacherIds = (existing.teachers ?? [])
    .map((t) => (typeof t === 'object' && t !== null ? Number(t.id) : Number(t)))
    .sort((a, b) => a - b)
  const desiredTeacherIds = [...desired.teacherIds].sort((a, b) => a - b)
  if (JSON.stringify(existingTeacherIds) !== JSON.stringify(desiredTeacherIds)) changed.push('teachers')

  if ((existing.location ?? '') !== (desired.location ?? '')) changed.push('location')
  if ((existing.studentCount ?? undefined) !== desired.studentCount) changed.push('studentCount')
  if (existing.status !== desired.status) changed.push('status')
  if ((existing.soortOverride ?? undefined) !== desired.soortOverride) changed.push('soortOverride')
  if ((existing.remark ?? '') !== (desired.remark ?? '')) changed.push('remark')
  return changed
}

/**
 * Runs the full legacy-spreadsheet import: maps every raw row, resolves
 * or plans Schools/Teachers/Programs (identity: their existing unique
 * name), and resolves or plans Bookings/Lessons/Closures (identity: a
 * deterministic `importRef`, so re-running against the same or an updated
 * export is idempotent — see normalize.ts's key builders).
 *
 * Dry-run (the default, `options.commit` falsy) never calls
 * `payload.create`/`payload.update`; every count in the returned report is
 * computed from read-only `payload.find` lookups plus the rows themselves.
 * `options.commit: true` performs the same resolution and actually writes.
 *
 * Booking/Closure identity is derived from their own defining fields
 * (school, program, groupLabel, date), so those two are strictly
 * create-or-skip: if the importRef already exists, none of the fields
 * that produced it could have changed. Lessons are the one entity that
 * legitimately drifts between two exports of the same spreadsheet (a
 * status moved forward, a date got rescheduled, ...), so lessons are
 * diffed field-by-field and updated when they differ.
 */
export async function runLegacyImport(
  payload: Payload,
  config: LegacyImportConfig,
  rawRows: Record<string, string>[],
  options: { commit: boolean },
): Promise<ImportReport> {
  const { commit } = options

  const schoolCache: NameCache = new Map()
  const teacherCache: NameCache = new Map()
  const programCache: NameCache = new Map()
  const schoolsToCreate: string[] = []
  const teachersToCreate: string[] = []
  const programsToCreate: string[] = []
  const rowErrors: RowError[] = []
  let bookingsToCreate = 0
  let closuresToCreate = 0
  let lessonsToCreate = 0
  let lessonsUnchanged = 0
  const lessonsToUpdate: LessonChange[] = []

  const lessonGroups = new Map<string, { rowNumber: number; row: MappedLessonRow }[]>()

  for (const [index, raw] of rawRows.entries()) {
    const rowNumber = index + 2 // header is row 1, matching what a spreadsheet app shows
    const result = mapRow(raw, config, rowNumber)
    if (!result.ok) {
      rowErrors.push({ row: rowNumber, error: result.error })
      continue
    }

    if (result.row.kind === 'closure') {
      const school = await resolveNamedEntity(
        payload,
        'schools',
        'name',
        result.row.schoolName,
        { country: config.defaultCountry },
        schoolCache,
        schoolsToCreate,
        commit,
      )

      const startDateIso = result.row.startDate.toISOString()
      const importRef = result.row.rowId ? rowIdKey(result.row.rowId) : closureKey(result.row.schoolName, result.row.label, startDateIso)

      const existing = await payload.find({ collection: 'closures', where: { importRef: { equals: importRef } }, limit: 1, depth: 0 })
      if (existing.docs[0]) continue // identity == defining fields, so an existing closure can never need an update

      closuresToCreate++
      if (commit && school) {
        await payload.create({
          collection: 'closures',
          data: { school: school.id, label: result.row.label, startDate: startDateIso, importRef },
          overrideAccess: true,
        })
      }
      continue
    }

    const key = bookingGroupKey(result.row)
    const group = lessonGroups.get(key) ?? []
    group.push({ rowNumber, row: result.row })
    lessonGroups.set(key, group)
  }

  for (const rows of lessonGroups.values()) {
    const sorted = [...rows].sort((a, b) => {
      const dateDiff = a.row.lessonDate.getTime() - b.row.lessonDate.getTime()
      return dateDiff !== 0 ? dateDiff : a.rowNumber - b.rowNumber
    })
    const first = sorted[0].row

    const school = await resolveNamedEntity(
      payload,
      'schools',
      'name',
      first.schoolName,
      { country: config.defaultCountry },
      schoolCache,
      schoolsToCreate,
      commit,
    )
    const program = await resolveNamedEntity(
      payload,
      'programs',
      'name',
      first.programName,
      { soort: first.soort },
      programCache,
      programsToCreate,
      commit,
    )

    const startDateIso = first.lessonDate.toISOString()
    const bookingImportRef = bookingKey(first.schoolName, first.programName, first.groupLabel, startDateIso)

    let bookingId: number | null = null
    const existingBooking = await payload.find({
      collection: 'bookings',
      where: { importRef: { equals: bookingImportRef } },
      limit: 1,
      depth: 0,
    })
    if (existingBooking.docs[0]) {
      bookingId = Number(existingBooking.docs[0].id)
    } else {
      bookingsToCreate++
      if (commit && school && program) {
        const created = await payload.create({
          collection: 'bookings',
          data: {
            school: school.id,
            program: program.id,
            groupLabel: first.groupLabel || undefined,
            startDate: startDateIso,
            status: 'nieuw',
            importRef: bookingImportRef,
          },
          // The import writes real historical lessons itself, one per source
          // row -- generateLessonsFromBooking must not also template-generate
          // a second set, and a bulk historical load must not fan out into a
          // wave of status-change emails. See both hooks' own comments.
          context: { skipLessonGeneration: true, skipNotification: true },
          overrideAccess: true,
        })
        bookingId = Number(created.id)
      }
    }

    for (const [sequenceIndex, entry] of sorted.entries()) {
      const sequenceNo = sequenceIndex + 1
      const row = entry.row

      const teacherIds: number[] = []
      for (const teacherName of row.teacherNames) {
        const kind = isOrganisationTeacher(teacherName, config.organisationTeacherNames) ? 'organisation' : 'person'
        const teacher = await resolveNamedEntity(
          payload,
          'teachers',
          'displayName',
          teacherName,
          { kind },
          teacherCache,
          teachersToCreate,
          commit,
        )
        if (teacher) teacherIds.push(teacher.id)
      }

      const soortOverride = program && row.soort && row.soort !== first.soort ? row.soort : undefined
      const importRef = row.rowId ? rowIdKey(row.rowId) : lessonKey(bookingImportRef, sequenceNo)

      const existingLesson = await payload.find({
        collection: 'lessons',
        where: { importRef: { equals: importRef } },
        limit: 1,
        depth: 0,
      })

      const desired = {
        lessonDate: row.lessonDate.toISOString(),
        startTime: row.startTime,
        endTime: row.endTime,
        groupLabel: row.groupLabel || undefined,
        teacherIds,
        location: row.location,
        studentCount: row.studentCount,
        status: row.status,
        soortOverride,
        remark: row.remark,
      }

      if (existingLesson.docs[0]) {
        const existing = existingLesson.docs[0] as Lesson
        const changedFields = lessonNeedsUpdate(existing, desired)
        if (changedFields.length === 0) {
          lessonsUnchanged++
          continue
        }
        lessonsToUpdate.push({ importRef, school: first.schoolName, program: first.programName, sequenceNo, fields: changedFields })
        if (commit) {
          await payload.update({
            collection: 'lessons',
            id: existing.id,
            data: {
              lessonDate: desired.lessonDate,
              startTime: desired.startTime,
              endTime: desired.endTime,
              groupLabel: desired.groupLabel,
              teachers: desired.teacherIds,
              location: desired.location,
              studentCount: desired.studentCount,
              status: desired.status,
              soortOverride: desired.soortOverride,
              remark: desired.remark,
            },
            context: { skipNotification: true },
            overrideAccess: true,
          })
        }
        continue
      }

      lessonsToCreate++
      if (commit && bookingId) {
        await payload.create({
          collection: 'lessons',
          data: {
            booking: bookingId,
            sequenceNo,
            lessonDate: desired.lessonDate,
            startTime: desired.startTime,
            endTime: desired.endTime,
            groupLabel: desired.groupLabel,
            teachers: desired.teacherIds,
            location: desired.location,
            studentCount: desired.studentCount,
            status: desired.status,
            soortOverride: desired.soortOverride,
            remark: desired.remark,
            importRef,
          },
          context: { skipNotification: true },
          overrideAccess: true,
        })
      }
    }
  }

  return {
    deploymentLabel: config.deploymentLabel,
    committed: commit,
    totalRows: rawRows.length,
    schoolsToCreate,
    teachersToCreate,
    programsToCreate,
    bookingsToCreate,
    closuresToCreate,
    lessonsToCreate,
    lessonsToUpdate,
    lessonsUnchanged,
    rowErrors,
  }
}

function bookingGroupKey(row: MappedLessonRow): string {
  return [row.schoolName.toLowerCase(), row.programName.toLowerCase(), row.groupLabel.toLowerCase()].join('|')
}
