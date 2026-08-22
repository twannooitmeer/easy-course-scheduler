'use client'

import { useMemo, useState } from 'react'

import type { Locale } from '../i18n/locale'
import { t } from '../i18n/t'
import { filterBookings, filtersToSearchParams, hasActiveFilters, type PlanningFilters } from './filters'
import { PlanningFilterBar } from './PlanningFilterBar'
import { PlanningGrid } from './PlanningGrid'
import { PlanningMobileList } from './PlanningMobileList'
import type { BookingWithLessons, ProgramOption, SchoolOption, TeacherOption } from './types'

/**
 * Owns filter state above both the desktop grid and the mobile card list, so
 * the same filters narrow whichever one the CSS breakpoint shows, and the
 * Export PDF link can carry the current filters as query params -- the
 * export route re-applies the identical filterBookings() logic server-side
 * rather than trusting anything about what the client currently displays.
 */
export function PlanningApp({
  bookings,
  teacherOptions,
  schoolOptions,
  programOptions,
  locale,
}: {
  bookings: BookingWithLessons[]
  teacherOptions: TeacherOption[]
  schoolOptions: SchoolOption[]
  programOptions: ProgramOption[]
  locale: Locale
}) {
  const [filters, setFilters] = useState<PlanningFilters>({})
  const filtered = useMemo(() => filterBookings(bookings, filters), [bookings, filters])
  const exportQuery = filtersToSearchParams(filters).toString()
  const exportHref = exportQuery ? `/planning/export?${exportQuery}` : '/planning/export'

  return (
    <>
      <div className="page-header-actions planning-toolbar">
        <PlanningFilterBar
          filters={filters}
          onChange={setFilters}
          schoolOptions={schoolOptions}
          programOptions={programOptions}
          teacherOptions={teacherOptions}
          locale={locale}
        />
        <a href={exportHref} className="admin-link">
          {t(locale, 'planning.exportPdf')}
        </a>
      </div>

      {hasActiveFilters(filters) && (
        <p className="filter-notice">{t(locale, 'planning.exportFilteredNotice', { count: filtered.length })}</p>
      )}

      {filtered.length === 0 && bookings.length > 0 ? (
        <div className="empty-state">
          <p>{t(locale, 'planning.noResultsFiltered')}</p>
        </div>
      ) : (
        <>
          <div className="planning-desktop-grid">
            <PlanningGrid bookings={filtered} teacherOptions={teacherOptions} />
          </div>
          <PlanningMobileList bookings={filtered} locale={locale} />
        </>
      )}
    </>
  )
}
