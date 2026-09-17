/**
 * Pure, DB-free helpers shared by mapRow.ts and importer.ts. Kept separate
 * so they're directly unit-testable without a Payload/Postgres instance —
 * see tests/int/legacyImportNormalize.int.spec.ts.
 */

/** Collapses internal whitespace runs to a single space and trims both ends. */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Case-insensitive lookup of a column's value from a raw parsed row, keyed
 * by the deployment config's own header spelling. Headers are matched
 * trimmed and case-insensitively, since spreadsheet exports routinely
 * carry inconsistent header casing across sheets/versions.
 */
export function getColumn(row: Record<string, string>, header: string | undefined): string {
  if (!header) return ''
  const wanted = header.trim().toLowerCase()
  const key = Object.keys(row).find((k) => k.trim().toLowerCase() === wanted)
  return key ? normalizeWhitespace(String(row[key] ?? '')) : ''
}

/**
 * Returns the first configured keyword found (case-insensitively) inside
 * `text`, or undefined. Used to detect a closure row — see
 * LegacyImportConfig.closureKeywords.
 */
export function matchesKeyword(text: string, keywords: string[]): string | undefined {
  const lower = text.toLowerCase()
  return keywords.find((keyword) => keyword.length > 0 && lower.includes(keyword.toLowerCase()))
}

/**
 * Strips a matched closure keyword, and a leading dash-style separator
 * ("-", "–", "—") immediately before it, off the end of a school cell —
 * e.g. `stripClosureKeyword("Example School - study day", "study day")`
 * returns `"Example School"`, the same School record the school's real
 * lesson rows resolve to.
 */
export function stripClosureKeyword(schoolCell: string, keyword: string): string {
  const idx = schoolCell.toLowerCase().lastIndexOf(keyword.toLowerCase())
  if (idx === -1) return normalizeWhitespace(schoolCell)
  const before = schoolCell.slice(0, idx)
  return normalizeWhitespace(before.replace(/[-–—]\s*$/, ''))
}

/** Splits a multi-teacher free-text cell on `separator`, trimming and dropping empty pieces. */
export function splitTeacherNames(cell: string, separator: string): string[] {
  if (!cell) return []
  return cell
    .split(separator)
    .map(normalizeWhitespace)
    .filter((name) => name.length > 0)
}

/** Case-insensitive, whitespace-normalized membership check against `organisationTeacherNames`. */
export function isOrganisationTeacher(name: string, organisationNames: string[]): boolean {
  const normalized = normalizeWhitespace(name).toLowerCase()
  return organisationNames.some((org) => normalizeWhitespace(org).toLowerCase() === normalized)
}

/**
 * Default date parser: accepts ISO (`yyyy-mm-dd`, optionally with a time
 * component, which is ignored) and day-first `d-m-yyyy` / `d/m/yyyy`.
 * Returns null (a row error, not a guess) for anything else — a
 * deployment with a different format should pass its own `parseDate` in
 * its config instead of teaching this one more formats.
 */
export function parseDefaultDate(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (iso) {
    const [, y, m, d] = iso
    return toUtcDate(Number(y), Number(m), Number(d))
  }

  const dayFirst = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed)
  if (dayFirst) {
    const [, d, m, y] = dayFirst
    return toUtcDate(Number(y), Number(m), Number(d))
  }

  return null
}

function toUtcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return null
  // Guard against JS's own overflow normalization (e.g. month 13 silently
  // rolling into next year) rather than accepting a date that doesn't
  // actually match what was typed.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date
}

/**
 * Combines a lesson's own date with an `HH:MM` time-of-day cell into the
 * full ISO datetime the Lessons collection's `startTime`/`endTime` fields
 * store. Returns `undefined` for a blank cell (field left unset) and
 * `'invalid'` for a non-blank cell that isn't `HH:MM` — a row error, not a
 * silent drop.
 */
export function combineDateAndTime(date: Date, raw: string | undefined): string | undefined | 'invalid' {
  if (!raw || !raw.trim()) return undefined
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim())
  if (!match) return 'invalid'
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return 'invalid'
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes)).toISOString()
}

/** Deterministic identity key for a group of lesson rows that become one Booking. */
export function bookingKey(schoolName: string, programName: string, groupLabel: string, startDateIso: string): string {
  return [
    'booking',
    normalizeWhitespace(schoolName).toLowerCase(),
    normalizeWhitespace(programName).toLowerCase(),
    normalizeWhitespace(groupLabel).toLowerCase(),
    startDateIso,
  ].join('|')
}

/** Deterministic identity key for one Lesson within a booking group. */
export function lessonKey(bookingImportRef: string, sequenceNo: number): string {
  return `${bookingImportRef}#${sequenceNo}`
}

/** Deterministic identity key for a Closure row. */
export function closureKey(schoolName: string, label: string, startDateIso: string): string {
  return [
    'closure',
    normalizeWhitespace(schoolName).toLowerCase(),
    normalizeWhitespace(label).toLowerCase(),
    startDateIso,
  ].join('|')
}

/** Wraps an explicit source rowId as an importRef, when the source config provides one. */
export function rowIdKey(rowId: string): string {
  return `row:${normalizeWhitespace(rowId)}`
}
