'use client'

import type { Locale } from '../i18n/locale'
import { t } from '../i18n/t'
import { toDateInputValue, toTimeInputValue } from './dateHelpers'
import { statusLabel, teacherNames } from './format'
import type { BookingWithLessons } from './types'

type AgendaEntry = {
  lesson: BookingWithLessons['lessons'][number]
  booking: BookingWithLessons
}

/**
 * Flattens every Booking's Lessons into a single chronological, day-grouped
 * agenda -- the natural view for "what's happening this week/month", which
 * a table (grouped by Booking, not by date) doesn't answer directly. One
 * component covers both desktop and mobile: unlike the editable grid, an
 * agenda list doesn't need a separate touch-friendly variant.
 */
function groupByDay(bookings: BookingWithLessons[]): [string, AgendaEntry[]][] {
  const byDay = new Map<string, AgendaEntry[]>()

  for (const booking of bookings) {
    for (const lesson of booking.lessons) {
      const day = toDateInputValue(lesson.lessonDate)
      const existing = byDay.get(day) ?? []
      existing.push({ lesson, booking })
      byDay.set(day, existing)
    }
  }

  for (const entries of byDay.values()) {
    entries.sort((a, b) => toTimeInputValue(a.lesson.startTime).localeCompare(toTimeInputValue(b.lesson.startTime)))
  }

  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function formatDayHeading(day: string, locale: Locale): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  return date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function PlanningCalendar({ bookings, locale }: { bookings: BookingWithLessons[]; locale: Locale }) {
  const days = groupByDay(bookings)

  if (days.length === 0) {
    return (
      <div className="empty-state">
        <p>{t(locale, 'planning.emptyTitle')}</p>
        <p>{t(locale, 'planning.emptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="calendar-agenda">
      {days.map(([day, entries]) => (
        <div className="agenda-day" key={day}>
          <div className="agenda-day-heading">{formatDayHeading(day, locale)}</div>
          <ul className="agenda-day-lessons">
            {entries.map(({ lesson, booking }) => {
              const school = typeof booking.school === 'object' ? booking.school.name : String(booking.school)
              const program = typeof booking.program === 'object' ? booking.program.name : String(booking.program)
              const details = [teacherNames(lesson), lesson.location].filter(Boolean).join(' · ')

              return (
                <li className="agenda-lesson" key={lesson.id}>
                  <span className="agenda-lesson-time">
                    {toTimeInputValue(lesson.startTime) || '—'}
                    {toTimeInputValue(lesson.endTime) && `–${toTimeInputValue(lesson.endTime)}`}
                  </span>
                  <div className="agenda-lesson-main">
                    <div className="agenda-lesson-title">
                      {school} — {program}
                      {booking.groupLabel && <span className="booking-card-group">{booking.groupLabel}</span>}
                    </div>
                    {details && <div className="agenda-lesson-meta">{details}</div>}
                  </div>
                  <span className={`status-pill status-${lesson.status}`}>{statusLabel(lesson.status)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
