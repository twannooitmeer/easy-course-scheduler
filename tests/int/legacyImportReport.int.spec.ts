import { describe, expect, it } from 'vitest'

import type { ImportReport } from '../../scripts/legacy-import/importer'
import { formatReport } from '../../scripts/legacy-import/report'

/**
 * Pure, DB-free unit tests for scripts/legacy-import/report.ts, per its own
 * doc comment ("unit-tested directly on a hand-built report object").
 */

function buildReport(overrides: Partial<ImportReport> = {}): ImportReport {
  return {
    deploymentLabel: 'Test Deployment',
    committed: false,
    totalRows: 0,
    schoolsToCreate: [],
    teachersToCreate: [],
    programsToCreate: [],
    bookingsToCreate: 0,
    closuresToCreate: 0,
    lessonsToCreate: 0,
    lessonsToUpdate: [],
    lessonsUnchanged: 0,
    rowErrors: [],
    ...overrides,
  }
}

describe('formatReport', () => {
  it('labels a dry run as such', () => {
    const text = formatReport(buildReport({ committed: false }))
    expect(text).toContain('DRY RUN')
    expect(text).toContain('--commit to apply')
  })

  it('labels a committed run as applied', () => {
    const text = formatReport(buildReport({ committed: true }))
    expect(text).toContain('APPLIED')
    expect(text).not.toContain('DRY RUN')
  })

  it('includes the deployment label and row count', () => {
    const text = formatReport(buildReport({ deploymentLabel: 'Example Deployment 2026-2027', totalRows: 42 }))
    expect(text).toContain('Example Deployment 2026-2027')
    expect(text).toContain('Rows read: 42')
  })

  it('lists every school/teacher/program to create by name', () => {
    const text = formatReport(
      buildReport({
        schoolsToCreate: ['Voorbeeldschool Noord', 'Voorbeeldschool Zuid'],
        teachersToCreate: ['Jansen'],
        programsToCreate: ['Lentekriebels'],
      }),
    )
    expect(text).toContain('Schools to create: 2')
    expect(text).toContain('- Voorbeeldschool Noord')
    expect(text).toContain('- Voorbeeldschool Zuid')
    expect(text).toContain('Teachers to create: 1')
    expect(text).toContain('- Jansen')
    expect(text).toContain('Programs to create: 1')
    expect(text).toContain('- Lentekriebels')
  })

  it('reports zero counts for an empty dry run with no changes', () => {
    const text = formatReport(buildReport())
    expect(text).toContain('Schools to create: 0')
    expect(text).toContain('Bookings to create: 0')
    expect(text).toContain('Closures to create: 0')
    expect(text).toContain('Lessons to create: 0')
    expect(text).toContain('Lessons unchanged (already imported, nothing differs): 0')
    expect(text).toContain('Lessons to update: 0')
    expect(text).toContain('No row errors.')
  })

  it('lists each lesson update with which fields changed', () => {
    const text = formatReport(
      buildReport({
        lessonsToUpdate: [
          { importRef: 'booking|x#1', school: 'Voorbeeldschool Noord', program: 'Lentekriebels', sequenceNo: 1, fields: ['status', 'studentCount'] },
        ],
      }),
    )
    expect(text).toContain('Lessons to update: 1')
    expect(text).toContain('lesson 1: status, studentCount')
  })

  it('lists row errors instead of "No row errors" when there are any', () => {
    const text = formatReport(buildReport({ rowErrors: [{ row: 7, error: 'missing a value in the school column' }] }))
    expect(text).toContain('Row errors (1)')
    expect(text).toContain('Row 7: missing a value in the school column')
    expect(text).not.toContain('No row errors.')
  })
})
