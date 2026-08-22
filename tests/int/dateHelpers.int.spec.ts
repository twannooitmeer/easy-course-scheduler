import { describe, expect, it } from 'vitest'

import {
  fromDateInputValue,
  fromTimeInputValue,
  toDateInputValue,
  toTimeInputValue,
} from '../../src/app/(frontend)/planning/dateHelpers'

describe('planning grid date/time helpers', () => {
  describe('toDateInputValue / fromDateInputValue', () => {
    it('extracts the date portion from a stored ISO string', () => {
      expect(toDateInputValue('2026-09-01T00:00:00.000Z')).toBe('2026-09-01')
    })

    it('handles null/undefined/empty as an empty input value', () => {
      expect(toDateInputValue(null)).toBe('')
      expect(toDateInputValue(undefined)).toBe('')
      expect(toDateInputValue('')).toBe('')
    })

    it('round-trips a date input value back to a UTC-midnight ISO string', () => {
      expect(fromDateInputValue('2026-09-01')).toBe('2026-09-01T00:00:00.000Z')
    })

    it('treats an empty date input as clearing the field', () => {
      expect(fromDateInputValue('')).toBeNull()
    })

    it('round-trips without drifting the calendar day', () => {
      const original = '2026-12-31'
      const iso = fromDateInputValue(original)
      expect(toDateInputValue(iso)).toBe(original)
    })
  })

  describe('toTimeInputValue / fromTimeInputValue', () => {
    it('extracts HH:MM from a stored ISO string, ignoring the reference date', () => {
      expect(toTimeInputValue('1970-01-01T10:30:00.000Z')).toBe('10:30')
      // Any reference date works -- only the time digits are meaningful.
      expect(toTimeInputValue('2026-09-01T14:05:00.000Z')).toBe('14:05')
    })

    it('handles null/undefined/empty as an empty input value', () => {
      expect(toTimeInputValue(null)).toBe('')
      expect(toTimeInputValue(undefined)).toBe('')
      expect(toTimeInputValue('')).toBe('')
    })

    it('round-trips a time input value back to a fixed-reference-date ISO string', () => {
      expect(fromTimeInputValue('09:15')).toBe('1970-01-01T09:15:00.000Z')
    })

    it('treats an empty time input as clearing the field', () => {
      expect(fromTimeInputValue('')).toBeNull()
    })

    it('round-trips without shifting across midnight at either boundary', () => {
      expect(toTimeInputValue(fromTimeInputValue('00:00')!)).toBe('00:00')
      expect(toTimeInputValue(fromTimeInputValue('23:59')!)).toBe('23:59')
    })
  })
})
