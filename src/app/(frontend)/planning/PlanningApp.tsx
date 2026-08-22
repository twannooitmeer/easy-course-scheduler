'use client'

import { useMemo, useState } from 'react'

import type { Locale } from '../i18n/locale'
import { t } from '../i18n/t'
import { filterBookings, filtersToSearchParams, hasActiveFilters, type PlanningFilters } from './filters'
import { PlanningCalendar } from './PlanningCalendar'
import { PlanningFilterBar } from './PlanningFilterBar'
import { PlanningGrid } from './PlanningGrid'
import { PlanningMobileList } from './PlanningMobileList'
import type { BookingWithLessons, ProgramOption, SchoolOption, TeacherOption } from './types'

type ViewMode = 'grid' | 'calendar'

/**
 * Owns filter state above the desktop grid, the mobile card list, and the
 * calendar/agenda view, so the same filters narrow whichever one is
 * currently shown -- the CSS breakpoint picks grid vs. mobile-card within
 * "grid" mode, and the view toggle picks "grid" vs. "calendar" on top of
 * that. The Export PDF link carries the current filters as query params --
 * the export route re-applies the identical filterBookings() logic
 * server-side rather than trusting anything about what the client
 * currently displays.
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
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
        <div className="view-toggle">
          <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
            {t(locale, 'planning.viewGrid')}
          </button>
          <button
            type="button"
            className={viewMode === 'calendar' ? 'active' : ''}
            onClick={() => setViewMode('calendar')}
          >
            {t(locale, 'planning.viewCalendar')}
          </button>
        </div>
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
      ) : viewMode === 'calendar' ? (
        <PlanningCalendar bookings={filtered} locale={locale} />
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
