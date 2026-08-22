'use client'

import type { Locale } from '../i18n/locale'
import { t } from '../i18n/t'
import { hasActiveFilters, type PlanningFilters } from './filters'
import { STATUS_OPTIONS, type ProgramOption, type SchoolOption, type TeacherOption } from './types'

export function PlanningFilterBar({
  filters,
  onChange,
  schoolOptions,
  programOptions,
  teacherOptions,
  locale,
}: {
  filters: PlanningFilters
  onChange: (next: PlanningFilters) => void
  schoolOptions: SchoolOption[]
  programOptions: ProgramOption[]
  teacherOptions: TeacherOption[]
  locale: Locale
}) {
  function setFilter<K extends keyof PlanningFilters>(key: K, value: PlanningFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="filter-bar">
      <select
        value={filters.school ?? ''}
        onChange={(e) => setFilter('school', e.target.value ? Number(e.target.value) : undefined)}
        aria-label={t(locale, 'planning.filterSchool')}
      >
        <option value="">{t(locale, 'planning.filterAllSchools')}</option>
        {schoolOptions.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>

      <select
        value={filters.program ?? ''}
        onChange={(e) => setFilter('program', e.target.value ? Number(e.target.value) : undefined)}
        aria-label={t(locale, 'planning.filterProgram')}
      >
        <option value="">{t(locale, 'planning.filterAllPrograms')}</option>
        {programOptions.map((program) => (
          <option key={program.id} value={program.id}>
            {program.name}
          </option>
        ))}
      </select>

      <select
        value={filters.teacher ?? ''}
        onChange={(e) => setFilter('teacher', e.target.value ? Number(e.target.value) : undefined)}
        aria-label={t(locale, 'planning.filterTeacher')}
      >
        <option value="">{t(locale, 'planning.filterAllTeachers')}</option>
        {teacherOptions.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.displayName}
          </option>
        ))}
      </select>

      <select
        value={filters.status ?? ''}
        onChange={(e) => setFilter('status', (e.target.value || undefined) as PlanningFilters['status'])}
        aria-label={t(locale, 'planning.filterStatus')}
      >
        <option value="">{t(locale, 'planning.filterAllStatuses')}</option>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        className="filter-group-input"
        value={filters.group ?? ''}
        onChange={(e) => setFilter('group', e.target.value || undefined)}
        placeholder={t(locale, 'planning.filterGroupPlaceholder')}
        aria-label={t(locale, 'planning.filterGroup')}
      />

      <input
        type="month"
        value={filters.month ?? ''}
        onChange={(e) => setFilter('month', e.target.value || undefined)}
        aria-label={t(locale, 'planning.filterMonth')}
      />

      {hasActiveFilters(filters) && (
        <button type="button" className="icon-button" onClick={() => onChange({})}>
          {t(locale, 'planning.clearFilters')}
        </button>
      )}
    </div>
  )
}
