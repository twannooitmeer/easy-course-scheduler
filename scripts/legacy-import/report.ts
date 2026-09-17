import type { ImportReport } from './importer'

/** Renders an ImportReport as plain text for the CLI. Pure — unit-tested directly on a hand-built report object. */
export function formatReport(report: ImportReport): string {
  const lines: string[] = []

  lines.push(`Legacy import report — ${report.deploymentLabel}`)
  lines.push(report.committed ? 'Mode: APPLIED (changes were written)' : 'Mode: DRY RUN (no changes were made — pass --commit to apply)')
  lines.push('')
  lines.push(`Rows read: ${report.totalRows}`)
  lines.push('')

  lines.push(`Schools to create: ${report.schoolsToCreate.length}`)
  for (const name of report.schoolsToCreate) lines.push(`  - ${name}`)

  lines.push(`Teachers to create: ${report.teachersToCreate.length}`)
  for (const name of report.teachersToCreate) lines.push(`  - ${name}`)

  lines.push(`Programs to create: ${report.programsToCreate.length}`)
  for (const name of report.programsToCreate) lines.push(`  - ${name}`)

  lines.push(`Bookings to create: ${report.bookingsToCreate}`)
  lines.push(`Closures to create: ${report.closuresToCreate}`)
  lines.push(`Lessons to create: ${report.lessonsToCreate}`)
  lines.push(`Lessons unchanged (already imported, nothing differs): ${report.lessonsUnchanged}`)

  lines.push(`Lessons to update: ${report.lessonsToUpdate.length}`)
  for (const change of report.lessonsToUpdate) {
    lines.push(`  - ${change.school} — ${change.program}, lesson ${change.sequenceNo}: ${change.fields.join(', ')}`)
  }

  lines.push('')
  if (report.rowErrors.length > 0) {
    lines.push(`Row errors (${report.rowErrors.length}) — these rows were skipped:`)
    for (const rowError of report.rowErrors) lines.push(`  - Row ${rowError.row}: ${rowError.error}`)
  } else {
    lines.push('No row errors.')
  }

  return lines.join('\n')
}
