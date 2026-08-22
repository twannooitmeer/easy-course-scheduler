import { STATUS_OPTIONS, type BookingWithLessons } from './types'

/**
 * Status labels are deliberately not run through the i18n `t()` system --
 * they're the deployment's own Dutch workflow vocabulary in both locales
 * already (see the comments on Bookings.ts/Programs.ts), not English terms
 * needing translation.
 */
export function statusLabel(status: BookingWithLessons['status']): string {
  return STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status
}

export function teacherNames(lesson: BookingWithLessons['lessons'][number]): string {
  if (!lesson.teachers || lesson.teachers.length === 0) return ''
  return lesson.teachers
    .map((teacher) => (typeof teacher === 'object' ? teacher.displayName : String(teacher)))
    .join(', ')
}
