import { t } from '../i18n/t'
import type { Locale } from '../i18n/locale'
import { toDateInputValue, toTimeInputValue } from './dateHelpers'
import { statusLabel, teacherNames } from './format'
import type { BookingWithLessons } from './types'

/**
 * A read-only card view of the same data the desktop planning grid edits
 * inline -- shown only below the mobile breakpoint (see .planning-mobile-list
 * in styles.css), since none of the grid's inline-editable controls (date
 * pickers, status dropdowns, teacher chip-pickers) translate well to touch
 * at phone width. Checking the schedule on the go and editing it at a desk
 * are different enough use cases that this is a separate component rather
 * than a responsive reflow of PlanningGrid itself.
 */
export function PlanningMobileList({ bookings, locale }: { bookings: BookingWithLessons[]; locale: Locale }) {
  if (bookings.length === 0) {
    return (
      <div className="planning-mobile-list">
        <div className="empty-state">
          <p>{t(locale, 'planning.emptyTitle')}</p>
          <p>{t(locale, 'planning.emptyHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="planning-mobile-list">
      {bookings.map((booking) => {
        const school = typeof booking.school === 'object' ? booking.school.name : String(booking.school)
        const program = typeof booking.program === 'object' ? booking.program.name : String(booking.program)

        return (
          <div className="booking-card" key={booking.id}>
            <div className="booking-card-header">
              <div>
                <div className="booking-card-title">{school}</div>
                <div className="booking-card-subtitle">{program}</div>
              </div>
              <span className={`status-pill status-${booking.status}`}>{statusLabel(booking.status)}</span>
            </div>
            <div className="booking-card-meta">
              {booking.groupLabel && <span className="booking-card-group">{booking.groupLabel}</span>}
              <span>{toDateInputValue(booking.startDate)}</span>
            </div>
            {booking.lessons.length > 0 ? (
              <ul className="booking-card-lessons">
                {booking.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <div className="lesson-card-date">
                      {toDateInputValue(lesson.lessonDate)}
                      {toTimeInputValue(lesson.startTime) && ` · ${toTimeInputValue(lesson.startTime)}`}
                      {toTimeInputValue(lesson.endTime) && `–${toTimeInputValue(lesson.endTime)}`}
                      <span className={`status-pill status-${lesson.status}`}>{statusLabel(lesson.status)}</span>
                    </div>
                    {(teacherNames(lesson) || lesson.location) && (
                      <div className="lesson-card-details">
                        {[teacherNames(lesson), lesson.location].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-lessons">{t(locale, 'planning.emptyLessons')}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
