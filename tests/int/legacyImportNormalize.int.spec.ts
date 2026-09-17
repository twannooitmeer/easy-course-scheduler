import { describe, expect, it } from 'vitest'

import {
  bookingKey,
  closureKey,
  combineDateAndTime,
  getColumn,
  isOrganisationTeacher,
  lessonKey,
  matchesKeyword,
  normalizeWhitespace,
  parseDefaultDate,
  rowIdKey,
  splitTeacherNames,
  stripClosureKeyword,
} from '../../scripts/legacy-import/normalize'

/**
 * Pure, DB-free unit tests for scripts/legacy-import/normalize.ts. These
 * carry no Payload/Postgres dependency at all (unlike every other file in
 * tests/int/), they just live alongside the rest of the suite so `pnpm test`
 * picks them up in one run. Named per normalize.ts's own doc comment.
 */

describe('normalizeWhitespace', () => {
  it('collapses internal whitespace runs to a single space', () => {
    expect(normalizeWhitespace('Voorbeeldschool   Noord')).toBe('Voorbeeldschool Noord')
  })

  it('trims both ends', () => {
    expect(normalizeWhitespace('  Jansen  ')).toBe('Jansen')
  })

  it('returns an empty string unchanged', () => {
    expect(normalizeWhitespace('')).toBe('')
  })
})

describe('getColumn', () => {
  const row = { ' School ': ' Voorbeeldschool Noord ', Docent: 'Jansen', Status: '' }

  it('matches a header case-insensitively and trimmed on both the header and the config value', () => {
    expect(getColumn(row, 'school')).toBe('Voorbeeldschool Noord')
    expect(getColumn(row, 'SCHOOL')).toBe('Voorbeeldschool Noord')
    expect(getColumn(row, ' Docent ')).toBe('Jansen')
  })

  it('returns an empty string for a blank cell', () => {
    expect(getColumn(row, 'Status')).toBe('')
  })

  it('returns an empty string when the configured header is undefined', () => {
    expect(getColumn(row, undefined)).toBe('')
  })

  it('returns an empty string when the header is not present in the row at all', () => {
    expect(getColumn(row, 'Soort')).toBe('')
  })
})

describe('matchesKeyword', () => {
  it('finds a configured keyword case-insensitively', () => {
    expect(matchesKeyword('Voorbeeldschool Noord - Studiedag', ['studiedag', 'vakantie'])).toBe('studiedag')
  })

  it('returns undefined when nothing matches', () => {
    expect(matchesKeyword('Voorbeeldschool Noord', ['studiedag', 'vakantie'])).toBeUndefined()
  })

  it('ignores empty-string keywords rather than matching everything', () => {
    expect(matchesKeyword('anything at all', ['', 'vakantie'])).toBeUndefined()
  })
})

describe('stripClosureKeyword', () => {
  it('strips the keyword and a trailing dash separator', () => {
    expect(stripClosureKeyword('Voorbeeldschool Noord - studiedag', 'studiedag')).toBe('Voorbeeldschool Noord')
  })

  it('strips the keyword with an en dash or em dash separator too', () => {
    expect(stripClosureKeyword('Voorbeeldschool Noord – studiedag', 'studiedag')).toBe('Voorbeeldschool Noord')
    expect(stripClosureKeyword('Voorbeeldschool Noord — studiedag', 'studiedag')).toBe('Voorbeeldschool Noord')
  })

  it('matches the keyword case-insensitively', () => {
    expect(stripClosureKeyword('Voorbeeldschool Noord - STUDIEDAG', 'studiedag')).toBe('Voorbeeldschool Noord')
  })

  it('falls back to the normalized whole cell when the keyword is not actually present', () => {
    expect(stripClosureKeyword('Voorbeeldschool Noord', 'vakantie')).toBe('Voorbeeldschool Noord')
  })
})

describe('splitTeacherNames', () => {
  it('splits on the configured separator, trimming each piece', () => {
    expect(splitTeacherNames('Bakker en De Vries', ' en ')).toEqual(['Bakker', 'De Vries'])
  })

  it('treats a cell with no separator occurrence as a single name', () => {
    expect(splitTeacherNames('Jansen', ' en ')).toEqual(['Jansen'])
  })

  it('drops empty pieces from a trailing separator or blank cell', () => {
    expect(splitTeacherNames('', ' en ')).toEqual([])
    expect(splitTeacherNames('Jansen en ', ' en ')).toEqual(['Jansen'])
  })
})

describe('isOrganisationTeacher', () => {
  const organisationNames = ['Voorbeeld Cultuurhuis', 'Voorbeeld Theatergroep']

  it('matches case-insensitively and whitespace-normalized', () => {
    expect(isOrganisationTeacher('voorbeeld   cultuurhuis', organisationNames)).toBe(true)
    expect(isOrganisationTeacher('VOORBEELD CULTUURHUIS', organisationNames)).toBe(true)
  })

  it('returns false for a person name not on the list', () => {
    expect(isOrganisationTeacher('Jansen', organisationNames)).toBe(false)
  })
})

describe('parseDefaultDate', () => {
  it('parses ISO yyyy-mm-dd as UTC midnight', () => {
    const date = parseDefaultDate('2026-09-01')
    expect(date?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('ignores a time component on an ISO value', () => {
    const date = parseDefaultDate('2026-09-01T14:30:00Z')
    expect(date?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('parses day-first d-m-yyyy', () => {
    const date = parseDefaultDate('1-9-2026')
    expect(date?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('parses day-first d/m/yyyy', () => {
    const date = parseDefaultDate('15/9/2026')
    expect(date?.toISOString()).toBe('2026-09-15T00:00:00.000Z')
  })

  it('returns null for an empty or unparsable value', () => {
    expect(parseDefaultDate('')).toBeNull()
    expect(parseDefaultDate('not a date')).toBeNull()
  })

  it('returns null for a date that overflows (e.g. month 13) instead of silently rolling over', () => {
    expect(parseDefaultDate('2026-13-01')).toBeNull()
    expect(parseDefaultDate('32-1-2026')).toBeNull()
  })
})

describe('combineDateAndTime', () => {
  const date = new Date(Date.UTC(2026, 8, 1))

  it('combines the date with an HH:MM time into a full ISO datetime', () => {
    expect(combineDateAndTime(date, '09:45')).toBe('2026-09-01T09:45:00.000Z')
  })

  it('returns undefined for a blank or missing cell', () => {
    expect(combineDateAndTime(date, '')).toBeUndefined()
    expect(combineDateAndTime(date, undefined)).toBeUndefined()
  })

  it('returns "invalid" for a non-HH:MM value', () => {
    expect(combineDateAndTime(date, '9h45')).toBe('invalid')
  })

  it('returns "invalid" for an out-of-range hour or minute', () => {
    expect(combineDateAndTime(date, '24:00')).toBe('invalid')
    expect(combineDateAndTime(date, '09:60')).toBe('invalid')
  })
})

describe('key builders', () => {
  it('bookingKey is deterministic and case/whitespace-insensitive on its text inputs', () => {
    const a = bookingKey('Voorbeeldschool Noord', 'Lentekriebels', '3a', '2026-09-01T00:00:00.000Z')
    const b = bookingKey('voorbeeldschool   noord', 'lentekriebels', '3A', '2026-09-01T00:00:00.000Z')
    expect(a).toBe(b)
  })

  it('bookingKey differs when the start date differs', () => {
    const a = bookingKey('School', 'Program', '3a', '2026-09-01T00:00:00.000Z')
    const b = bookingKey('School', 'Program', '3a', '2026-09-08T00:00:00.000Z')
    expect(a).not.toBe(b)
  })

  it('lessonKey appends the sequence number to the booking key', () => {
    expect(lessonKey('booking|x', 2)).toBe('booking|x#2')
  })

  it('closureKey is deterministic and case/whitespace-insensitive', () => {
    const a = closureKey('Voorbeeldschool Noord', 'Studiedag hele school', '2026-10-05T00:00:00.000Z')
    const b = closureKey('voorbeeldschool  noord', 'studiedag   hele school', '2026-10-05T00:00:00.000Z')
    expect(a).toBe(b)
  })

  it('rowIdKey wraps and whitespace-normalizes an explicit source row id', () => {
    expect(rowIdKey('  42 ')).toBe('row:42')
  })

  it('the three key kinds never collide with each other even given the same raw text', () => {
    const booking = bookingKey('x', 'y', 'z', '2026-01-01T00:00:00.000Z')
    const closure = closureKey('x', 'y', '2026-01-01T00:00:00.000Z')
    expect(booking).not.toBe(closure)
  })
})
