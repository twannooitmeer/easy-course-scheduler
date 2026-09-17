import {
  combineDateAndTime,
  getColumn,
  matchesKeyword,
  normalizeWhitespace,
  parseDefaultDate,
  splitTeacherNames,
  stripClosureKeyword,
} from './normalize'
import type { CanonicalSoort, CanonicalStatus, LegacyImportConfig } from './types'

export type MappedClosureRow = {
  kind: 'closure'
  schoolName: string
  label: string
  startDate: Date
  rowId?: string
}

export type MappedLessonRow = {
  kind: 'lesson'
  schoolName: string
  programName: string
  groupLabel: string
  teacherNames: string[]
  status: CanonicalStatus
  soort?: CanonicalSoort
  lessonDate: Date
  startTime?: string
  endTime?: string
  location?: string
  studentCount?: number
  remark?: string
  rowId?: string
}

export type MappedRow = MappedClosureRow | MappedLessonRow

export type MapRowResult = { ok: true; row: MappedRow } | { ok: false; error: string }

function err(rowNumber: number, message: string): MapRowResult {
  return { ok: false, error: `Row ${rowNumber}: ${message}` }
}

/**
 * Maps one raw parsed row (header-keyed, per the deployment's own column
 * mapping) into either a MappedClosureRow or a MappedLessonRow, or a row
 * error. Pure and DB-free — every lookup this needs (statusMap, soortMap,
 * closureKeywords, ...) comes from `config`, never from a live database —
 * so it's fully unit-testable on its own. `importer.ts` is the only piece
 * that touches Payload.
 */
export function mapRow(raw: Record<string, string>, config: LegacyImportConfig, rowNumber: number): MapRowResult {
  const c = config.columns

  const schoolRaw = getColumn(raw, c.school)
  const programRaw = getColumn(raw, c.program)
  const teachersRaw = getColumn(raw, c.teachers)
  const groupLabelRaw = getColumn(raw, c.groupLabel)
  const statusRaw = getColumn(raw, c.status)
  const soortRaw = getColumn(raw, c.soort)
  const lessonDateRaw = getColumn(raw, c.lessonDate)
  const startTimeRaw = getColumn(raw, c.startTime)
  const endTimeRaw = getColumn(raw, c.endTime)
  const locationRaw = getColumn(raw, c.location)
  const studentCountRaw = getColumn(raw, c.studentCount)
  const remarkRaw = getColumn(raw, c.remark)
  const rowIdRaw = getColumn(raw, c.rowId)

  if (!schoolRaw) return err(rowNumber, 'missing a value in the school column')

  const parseDate = config.parseDate ?? parseDefaultDate

  // Closure detection happens before anything else requires a program,
  // since a closure row (a study day, a holiday, ...) legitimately has no
  // program/teacher/status at all in the source sheet.
  const closureSource = [schoolRaw, groupLabelRaw, remarkRaw].filter(Boolean).join(' ')
  const matchedKeyword = matchesKeyword(closureSource, config.closureKeywords)
  if (matchedKeyword) {
    const cleanedSchoolName = stripClosureKeyword(schoolRaw, matchedKeyword)
    if (!cleanedSchoolName) {
      return err(rowNumber, `closure row has no school name left after stripping "${matchedKeyword}"`)
    }
    const startDate = parseDate(lessonDateRaw)
    if (!startDate) return err(rowNumber, `could not parse date "${lessonDateRaw}"`)

    const label = normalizeWhitespace(remarkRaw || groupLabelRaw || matchedKeyword)
    return {
      ok: true,
      row: { kind: 'closure', schoolName: cleanedSchoolName, label, startDate, rowId: rowIdRaw || undefined },
    }
  }

  if (!programRaw) return err(rowNumber, 'missing a value in the program column')

  const lessonDate = parseDate(lessonDateRaw)
  if (!lessonDate) return err(rowNumber, `could not parse date "${lessonDateRaw}"`)

  let status: CanonicalStatus = 'nieuw'
  if (statusRaw) {
    const mapped = config.statusMap[statusRaw.toLowerCase()]
    if (!mapped) return err(rowNumber, `unrecognized status "${statusRaw}" — add it to statusMap`)
    status = mapped
  }

  let soort: CanonicalSoort | undefined
  if (soortRaw) {
    if (!config.soortMap) {
      return err(rowNumber, `soort column has a value ("${soortRaw}") but this config has no soortMap`)
    }
    const mapped = config.soortMap[soortRaw.toLowerCase()]
    if (!mapped) return err(rowNumber, `unrecognized soort "${soortRaw}" — add it to soortMap`)
    soort = mapped
  }

  let studentCount: number | undefined
  if (studentCountRaw) {
    const parsed = Number(studentCountRaw)
    if (!Number.isFinite(parsed)) return err(rowNumber, `"${studentCountRaw}" is not a valid student count`)
    studentCount = parsed
  }

  const startTime = combineDateAndTime(lessonDate, startTimeRaw)
  if (startTime === 'invalid') return err(rowNumber, `"${startTimeRaw}" is not a valid start time (expected HH:MM)`)
  const endTime = combineDateAndTime(lessonDate, endTimeRaw)
  if (endTime === 'invalid') return err(rowNumber, `"${endTimeRaw}" is not a valid end time (expected HH:MM)`)

  return {
    ok: true,
    row: {
      kind: 'lesson',
      schoolName: schoolRaw,
      programName: programRaw,
      groupLabel: groupLabelRaw,
      teacherNames: splitTeacherNames(teachersRaw, config.teacherSeparator),
      status,
      soort,
      lessonDate,
      startTime,
      endTime,
      location: locationRaw || undefined,
      studentCount,
      remark: remarkRaw || undefined,
      rowId: rowIdRaw || undefined,
    },
  }
}
