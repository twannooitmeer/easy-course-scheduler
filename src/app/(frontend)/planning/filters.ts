import { relationId } from './groupLessons'
import type { BookingWithLessons, LessonStatus } from './types'

export type PlanningFilters = {
  school?: number
  program?: number
  teacher?: number
  status?: LessonStatus
  group?: string
  month?: string
}

const FILTER_KEYS = ['school', 'program', 'teacher', 'status', 'group', 'month'] as const

export function hasActiveFilters(filters: PlanningFilters): boolean {
  return FILTER_KEYS.some((key) => filters[key] !== undefined && filters[key] !== '')
}

/**
 * Booking-level filtering: school/program/status/group narrow which
 * bookings match directly; teacher and month look inside a booking's
 * lessons (teacher isn't a Booking field -- it's assigned per-Lesson, for
 * co-taught lessons -- and "does this booking touch this month" is more
 * useful for browsing a schedule than only checking the booking's own
 * start date, since a booking's lessons can run for months after it).
 * A matching booking is shown in full, not lesson-filtered internally --
 * keeps both PlanningGrid and PlanningMobileList's own rendering untouched.
 */
export function filterBookings(bookings: BookingWithLessons[], filters: PlanningFilters): BookingWithLessons[] {
  return bookings.filter((booking) => {
    if (filters.school !== undefined && relationId(booking.school) !== filters.school) return false
    if (filters.program !== undefined && relationId(booking.program) !== filters.program) return false
    if (filters.status !== undefined && booking.status !== filters.status) return false
    if (filters.group && !(booking.groupLabel ?? '').toLowerCase().includes(filters.group.toLowerCase())) {
      return false
    }
    if (filters.month && !booking.lessons.some((lesson) => lesson.lessonDate.startsWith(filters.month!))) {
      return false
    }
    if (
      filters.teacher !== undefined &&
      !booking.lessons.some((lesson) => (lesson.teachers ?? []).some((teacher) => relationId(teacher) === filters.teacher))
    ) {
      return false
    }
    return true
  })
}

export function filtersToSearchParams(filters: PlanningFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.school !== undefined) params.set('school', String(filters.school))
  if (filters.program !== undefined) params.set('program', String(filters.program))
  if (filters.teacher !== undefined) params.set('teacher', String(filters.teacher))
  if (filters.status !== undefined) params.set('status', filters.status)
  if (filters.group) params.set('group', filters.group)
  if (filters.month) params.set('month', filters.month)
  return params
}

export function filtersFromSearchParams(params: URLSearchParams): PlanningFilters {
  const school = params.get('school')
  const program = params.get('program')
  const teacher = params.get('teacher')
  const status = params.get('status')
  const group = params.get('group')
  const month = params.get('month')

  return {
    school: school ? Number(school) : undefined,
    program: program ? Number(program) : undefined,
    teacher: teacher ? Number(teacher) : undefined,
    status: (status as LessonStatus) || undefined,
    group: group || undefined,
    month: month || undefined,
  }
}
