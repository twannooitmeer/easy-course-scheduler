import type { Booking, Program } from '../../src/payload-types'

export type CanonicalStatus = Booking['status']
export type CanonicalSoort = NonNullable<Program['soort']>

/**
 * Column mapping for one deployment's export of its legacy scheduling
 * spreadsheet. Every value is a raw column header exactly as it appears in
 * that deployment's own file, matched case-insensitively after trimming
 * both sides — see example.config.ts for a fully worked, synthetic
 * example. Nothing about a real deployment's actual column names,
 * vocabulary, or data belongs in this repository; a real config lives
 * outside it (see scripts/legacy-import/README.md) and is passed to the
 * script by path.
 */
export interface ColumnMapping {
  /** The school/venue this row's lesson happened at. Required on every non-closure row. */
  school: string
  /** Free-text teacher name(s) for this row; see `teacherSeparator` for splitting a multi-teacher cell. */
  teachers: string
  /** The program/lesson-series name. Required on every non-closure row. */
  program: string
  /** This row's own lesson date (also used as a closure row's date). Required. */
  lessonDate: string
  /** Class/group label, e.g. "3a" or "6/7". */
  groupLabel?: string
  /** This row's own status text/legend value. Blank maps to "nieuw"; see `statusMap`. */
  status?: string
  /** This row's own soort/category text. See `soortMap`. */
  soort?: string
  /** Lesson start time, expected as `HH:MM`. */
  startTime?: string
  /** Lesson end time, expected as `HH:MM`. */
  endTime?: string
  /** Location/room override for this specific lesson. */
  location?: string
  /** Student headcount for this lesson. */
  studentCount?: string
  /** Free-text remark. Also checked for `closureKeywords`, alongside `school` and `groupLabel`. */
  remark?: string
  /**
   * A column that already uniquely identifies this row (e.g. a
   * spreadsheet's own row number, or an export ID). When present, it
   * becomes this row's `importRef` directly instead of a key derived from
   * (school, program, groupLabel, date, position) — the more robust choice
   * whenever the source file actually has one.
   */
  rowId?: string
}

export interface LegacyImportConfig {
  /** Shown in the report header; purely descriptive. */
  deploymentLabel: string
  columns: ColumnMapping
  /**
   * Splits a multi-teacher free-text cell, e.g. `"Jane Doe en John Roe"`
   * with separator `" en "`. A cell with no occurrence of the separator is
   * treated as a single teacher name.
   */
  teacherSeparator: string
  /**
   * Teacher display names that should be created with `kind: "organisation"`
   * instead of `"person"` (matched case-insensitively after whitespace
   * normalization). Configure per deployment — never commit a real
   * organisation's name into this list in this public repository; the
   * example config below uses only synthetic names.
   */
  organisationTeacherNames: string[]
  /**
   * Maps this deployment's raw status text to the app's canonical enum.
   * Keys must already be lowercase and whitespace-normalized (the script
   * normalizes each row's raw value the same way before lookup). A
   * blank/missing status column value always maps to `"nieuw"` regardless
   * of this map; a non-blank value with no entry here is a row error
   * rather than a silent guess.
   */
  statusMap: Record<string, CanonicalStatus>
  /**
   * Same idea as `statusMap`, for the soort/category column. Omit entirely
   * if the source has no such column; a row that has a soort value but no
   * `soortMap` configured is a row error, since that value would otherwise
   * be silently dropped.
   */
  soortMap?: Record<string, CanonicalSoort>
  /**
   * Case-insensitive substrings that mark a row as a closure (study day,
   * holiday, ...) rather than a real lesson — checked against the row's
   * school, groupLabel, and remark cells combined. A matching row creates
   * a Closure instead of a Booking/Lesson, with the matched keyword (and
   * a trailing separator like `" - "`) stripped back out of the school
   * name, so "Example School - study day" resolves to the same School
   * record as plain "Example School".
   */
  closureKeywords: string[]
  /** Default `School.country` when the source has no country column. Matches the Schools collection's own default. */
  defaultCountry?: string
  /**
   * Parses this deployment's own date format into a `Date` (UTC midnight).
   * Defaults to accepting ISO (`yyyy-mm-dd...`) and day-first
   * `d-m-yyyy`/`d/m/yyyy` if not overridden — see normalize.ts's
   * `parseDefaultDate`.
   */
  parseDate?: (raw: string) => Date | null
}
