import { describe, expect, it } from 'vitest'

import { mapRow } from '../../scripts/legacy-import/mapRow'
import type { LegacyImportConfig } from '../../scripts/legacy-import/types'

/**
 * Pure, DB-free unit tests for scripts/legacy-import/mapRow.ts, per its own
 * doc comment ("fully unit-testable on its own"). Uses a small synthetic
 * config shaped like example.config.ts rather than importing it directly,
 * so these tests stay independent of that file's own edits.
 */

function buildConfig(overrides: Partial<LegacyImportConfig> = {}): LegacyImportConfig {
  return {
    deploymentLabel: 'Test Deployment',
    columns: {
      school: 'School',
      teachers: 'Docent',
      program: 'Programma',
      lessonDate: 'Datum',
      groupLabel: 'Groep',
      status: 'Status',
      soort: 'Soort',
      startTime: 'Starttijd',
      endTime: 'Eindtijd',
      location: 'Locatie',
      studentCount: 'Aantal leerlingen',
      remark: 'Opmerking',
    },
    teacherSeparator: ' en ',
    organisationTeacherNames: ['Voorbeeld Cultuurhuis'],
    statusMap: {
      nieuw: 'nieuw',
      aangevraagd: 'aangevraagd_docent',
      'akkoord docent': 'akkoord_docent',
      'akkoord school': 'akkoord_school',
    },
    soortMap: {
      regulier: 'regulier',
      maatwerk: 'maatwerk',
    },
    closureKeywords: ['studiedag', 'vakantie'],
    defaultCountry: 'Nederland',
    ...overrides,
  }
}

function lessonRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    School: 'Voorbeeldschool Noord',
    Docent: 'Jansen',
    Programma: 'Lentekriebels',
    Datum: '2026-09-01',
    Groep: '3a',
    Status: '',
    Soort: 'regulier',
    Starttijd: '09:00',
    Eindtijd: '09:45',
    Locatie: 'Gymzaal',
    'Aantal leerlingen': '24',
    Opmerking: '',
    ...overrides,
  }
}

describe('mapRow: lesson rows', () => {
  it('maps a fully populated row', () => {
    const result = mapRow(lessonRow(), buildConfig(), 2)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.row.kind).toBe('lesson')
    if (result.row.kind !== 'lesson') return
    expect(result.row.schoolName).toBe('Voorbeeldschool Noord')
    expect(result.row.programName).toBe('Lentekriebels')
    expect(result.row.groupLabel).toBe('3a')
    expect(result.row.teacherNames).toEqual(['Jansen'])
    expect(result.row.status).toBe('nieuw')
    expect(result.row.soort).toBe('regulier')
    expect(result.row.lessonDate.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(result.row.startTime).toBe('2026-09-01T09:00:00.000Z')
    expect(result.row.endTime).toBe('2026-09-01T09:45:00.000Z')
    expect(result.row.location).toBe('Gymzaal')
    expect(result.row.studentCount).toBe(24)
  })

  it('defaults a blank status to "nieuw"', () => {
    const result = mapRow(lessonRow({ Status: '' }), buildConfig(), 2)
    expect(result.ok).toBe(true)
    if (result.ok && result.row.kind === 'lesson') expect(result.row.status).toBe('nieuw')
  })

  it('maps a configured status through statusMap', () => {
    const result = mapRow(lessonRow({ Status: 'akkoord school' }), buildConfig(), 2)
    expect(result.ok).toBe(true)
    if (result.ok && result.row.kind === 'lesson') expect(result.row.status).toBe('akkoord_school')
  })

  it('splits a multi-teacher cell on the configured separator', () => {
    const result = mapRow(lessonRow({ Docent: 'Bakker en De Vries' }), buildConfig(), 2)
    expect(result.ok).toBe(true)
    if (result.ok && result.row.kind === 'lesson') expect(result.row.teacherNames).toEqual(['Bakker', 'De Vries'])
  })

  it('leaves groupLabel, location, remark and student count unset when their cells are blank', () => {
    const result = mapRow(
      lessonRow({ Groep: '', Locatie: '', Opmerking: '', 'Aantal leerlingen': '', Starttijd: '', Eindtijd: '' }),
      buildConfig(),
      2,
    )
    expect(result.ok).toBe(true)
    if (!result.ok || result.row.kind !== 'lesson') return
    expect(result.row.groupLabel).toBe('')
    expect(result.row.location).toBeUndefined()
    expect(result.row.remark).toBeUndefined()
    expect(result.row.studentCount).toBeUndefined()
    expect(result.row.startTime).toBeUndefined()
    expect(result.row.endTime).toBeUndefined()
  })

  it('errors when the school column is blank', () => {
    const result = mapRow(lessonRow({ School: '' }), buildConfig(), 5)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Row 5: missing a value in the school column')
  })

  it('errors when the program column is blank', () => {
    const result = mapRow(lessonRow({ Programma: '' }), buildConfig(), 5)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('program column')
  })

  it('errors on a date it cannot parse', () => {
    const result = mapRow(lessonRow({ Datum: 'not-a-date' }), buildConfig(), 5)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('could not parse date')
  })

  it('errors on a status with no entry in statusMap, rather than guessing', () => {
    const result = mapRow(lessonRow({ Status: 'onbekende-status' }), buildConfig(), 8)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Row 8: unrecognized status "onbekende-status" — add it to statusMap')
  })

  it('errors on a soort value with no entry in soortMap', () => {
    const result = mapRow(lessonRow({ Soort: 'onbekend' }), buildConfig(), 3)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('unrecognized soort')
  })

  it('errors when the config has no soortMap at all but the row has a soort value', () => {
    const config = buildConfig()
    delete (config as { soortMap?: unknown }).soortMap
    const result = mapRow(lessonRow(), config, 3)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('no soortMap')
  })

  it('errors on a non-numeric student count', () => {
    const result = mapRow(lessonRow({ 'Aantal leerlingen': 'twintig' }), buildConfig(), 3)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('not a valid student count')
  })

  it('errors on an invalid start or end time', () => {
    const badStart = mapRow(lessonRow({ Starttijd: '9h00' }), buildConfig(), 3)
    expect(badStart.ok).toBe(false)
    const badEnd = mapRow(lessonRow({ Eindtijd: '25:00' }), buildConfig(), 3)
    expect(badEnd.ok).toBe(false)
  })

  it('carries an explicit rowId column through as-is when the config maps one', () => {
    const config = buildConfig({ columns: { ...buildConfig().columns, rowId: 'Rij-ID' } })
    const result = mapRow(lessonRow({ 'Rij-ID': '42' }), config, 2)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.row.rowId).toBe('42')
  })
})

describe('mapRow: closure rows', () => {
  it('detects a closure via a keyword in the school cell and strips it back out', () => {
    const result = mapRow(
      {
        School: 'Voorbeeldschool Noord - studiedag',
        Docent: '',
        Programma: '',
        Datum: '2026-10-05',
        Groep: '',
        Status: '',
        Soort: '',
        Starttijd: '',
        Eindtijd: '',
        Locatie: '',
        'Aantal leerlingen': '',
        Opmerking: 'Studiedag hele school',
      },
      buildConfig(),
      6,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.row.kind).toBe('closure')
    if (result.row.kind !== 'closure') return
    expect(result.row.schoolName).toBe('Voorbeeldschool Noord')
    expect(result.row.label).toBe('Studiedag hele school')
    expect(result.row.startDate.toISOString()).toBe('2026-10-05T00:00:00.000Z')
  })

  it('does not require a program, teacher or status on a closure row', () => {
    const result = mapRow(
      {
        School: 'Voorbeeldschool Noord - vakantie',
        Docent: '',
        Programma: '',
        Datum: '2026-10-19',
        Groep: '',
        Status: '',
        Soort: '',
        Starttijd: '',
        Eindtijd: '',
        Locatie: '',
        'Aantal leerlingen': '',
        Opmerking: '',
      },
      buildConfig(),
      9,
    )
    expect(result.ok).toBe(true)
  })

  it('falls back to the matched keyword as the label when there is no remark or groupLabel', () => {
    const result = mapRow(
      {
        School: 'Voorbeeldschool Noord - studiedag',
        Docent: '',
        Programma: '',
        Datum: '2026-10-05',
        Groep: '',
        Status: '',
        Soort: '',
        Starttijd: '',
        Eindtijd: '',
        Locatie: '',
        'Aantal leerlingen': '',
        Opmerking: '',
      },
      buildConfig(),
      6,
    )
    expect(result.ok).toBe(true)
    if (result.ok && result.row.kind === 'closure') expect(result.row.label).toBe('studiedag')
  })

  it('errors when stripping the keyword leaves no school name at all', () => {
    const result = mapRow(
      {
        School: 'studiedag',
        Docent: '',
        Programma: '',
        Datum: '2026-10-05',
        Groep: '',
        Status: '',
        Soort: '',
        Starttijd: '',
        Eindtijd: '',
        Locatie: '',
        'Aantal leerlingen': '',
        Opmerking: '',
      },
      buildConfig(),
      6,
    )
    expect(result.ok).toBe(false)
  })
})
