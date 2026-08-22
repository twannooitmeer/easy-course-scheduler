/**
 * This app only ever runs in one timezone (the schools it schedules for),
 * so dates/times are treated as literal wall-clock digits stored under a
 * UTC label, never converted across a timezone offset. `lessonDate` field
 * stores full-day ISO instants at UTC midnight; `startTime`/`endTime` store
 * a fixed reference date with only the HH:MM digits meaningful. This module
 * is the one place that convention gets encoded, so an HTML date/time
 * input's plain "YYYY-MM-DD" / "HH:MM" value round-trips through it
 * without ever going through real timezone conversion.
 */

const TIME_REFERENCE_DATE = '1970-01-01'

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export function fromDateInputValue(value: string): string | null {
  if (!value) return null
  return `${value}T00:00:00.000Z`
}

export function toTimeInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(11, 16)
}

export function fromTimeInputValue(value: string): string | null {
  if (!value) return null
  return `${TIME_REFERENCE_DATE}T${value}:00.000Z`
}
