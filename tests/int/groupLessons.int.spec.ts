import { describe, expect, it } from 'vitest'

import { groupLessonsByBooking, relationId } from '../../src/app/(frontend)/planning/groupLessons'
import type { Booking, Lesson } from '../../src/payload-types'

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1,
    school: 1,
    program: 1,
    startDate: '2026-09-01T00:00:00.000Z',
    status: 'nieuw',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  }
}

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 1,
    booking: 1,
    sequenceNo: 1,
    lessonDate: '2026-09-01T00:00:00.000Z',
    status: 'nieuw',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  }
}

describe('relationId', () => {
  it('returns the raw id when the relationship is unpopulated (depth: 0)', () => {
    expect(relationId(5)).toBe(5)
  })

  it('extracts .id when the relationship arrived populated (depth: 1)', () => {
    expect(relationId({ id: 5, name: 'De Meer' })).toBe(5)
  })

  it('returns null for null/undefined rather than NaN', () => {
    expect(relationId(null)).toBeNull()
    expect(relationId(undefined)).toBeNull()
  })
})

describe('groupLessonsByBooking', () => {
  it('attaches each lesson to its own booking, not another one', () => {
    const bookings = [makeBooking({ id: 1 }), makeBooking({ id: 2 })]
    const lessons = [
      makeLesson({ id: 10, booking: 1, sequenceNo: 1 }),
      makeLesson({ id: 11, booking: 2, sequenceNo: 1 }),
    ]

    const result = groupLessonsByBooking(bookings, lessons)

    expect(result.find((b) => b.id === 1)?.lessons.map((l) => l.id)).toEqual([10])
    expect(result.find((b) => b.id === 2)?.lessons.map((l) => l.id)).toEqual([11])
  })

  it('sorts lessons within a booking by sequenceNo regardless of query order', () => {
    const bookings = [makeBooking({ id: 1 })]
    const lessons = [
      makeLesson({ id: 30, booking: 1, sequenceNo: 3 }),
      makeLesson({ id: 10, booking: 1, sequenceNo: 1 }),
      makeLesson({ id: 20, booking: 1, sequenceNo: 2 }),
    ]

    const result = groupLessonsByBooking(bookings, lessons)

    expect(result[0].lessons.map((l) => l.sequenceNo)).toEqual([1, 2, 3])
  })

  it('handles a booking with no matching lessons as an empty array, not undefined', () => {
    const bookings = [makeBooking({ id: 1 })]
    const result = groupLessonsByBooking(bookings, [])

    expect(result[0].lessons).toEqual([])
  })

  it('correctly groups when the booking relationship arrives populated (depth: 1), not just a raw id', () => {
    const bookings = [makeBooking({ id: 1 })]
    const lessons = [
      makeLesson({
        id: 10,
        booking: makeBooking({ id: 1 }),
        sequenceNo: 1,
      }),
    ]

    const result = groupLessonsByBooking(bookings, lessons)

    expect(result[0].lessons.map((l) => l.id)).toEqual([10])
  })
})
