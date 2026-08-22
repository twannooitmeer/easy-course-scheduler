import type { Booking, Lesson } from '@/payload-types'

export type BookingWithLessons = Booking & {
  lessons: Lesson[]
}

export type TeacherOption = {
  id: number
  displayName: string
}

export type SchoolOption = {
  id: number
  name: string
}

export type ProgramOption = {
  id: number
  name: string
}

export type LessonStatus = Lesson['status']

export const STATUS_OPTIONS: { value: LessonStatus; label: string }[] = [
  { value: 'nieuw', label: 'Nieuw' },
  { value: 'aangevraagd_docent', label: 'Aangevraagd bij docent' },
  { value: 'akkoord_docent', label: 'Akkoord docent' },
  { value: 'akkoord_school', label: 'Akkoord school' },
]
