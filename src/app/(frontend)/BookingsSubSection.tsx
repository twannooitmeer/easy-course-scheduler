'use client'

import { useLocale } from './i18n/LocaleProvider'
import { STATUS_OPTIONS } from './planning/types'

export type BookingSummary = {
  id: number
  schoolName: string
  programName: string
  groupLabel?: string | null
  startDate: string
  status: string
}

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status
}

/**
 * Read-only booking list shown on School/Teacher detail pages. No filters
 * yet — those land alongside the same filters on the main planning grid,
 * once that's designed (deferred on purpose, not an oversight).
 */
export function BookingsSubSection({
  bookings,
  hideSchool = false,
}: {
  bookings: BookingSummary[]
  hideSchool?: boolean
}) {
  const { t } = useLocale()

  return (
    <div className="sub-section">
      <div className="sub-section-header">
        <h2>{t('bookingsSubSection.heading')}</h2>
      </div>

      {bookings.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{t('bookingsSubSection.empty')}</p>
      ) : (
        <table className="sub-table">
          <thead>
            <tr>
              {!hideSchool && <th>{t('bookingsSubSection.columnSchool')}</th>}
              <th>{t('bookingsSubSection.columnProgram')}</th>
              <th>{t('bookingsSubSection.columnGroup')}</th>
              <th>{t('bookingsSubSection.columnStartDate')}</th>
              <th>{t('bookingsSubSection.columnStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                {!hideSchool && <td>{booking.schoolName}</td>}
                <td>{booking.programName}</td>
                <td>{booking.groupLabel || t('common.none')}</td>
                <td>{new Date(booking.startDate).toLocaleDateString('en-GB')}</td>
                <td>{statusLabel(booking.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
