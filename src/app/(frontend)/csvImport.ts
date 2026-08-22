import Papa from 'papaparse'

export type ImportRowError = { row: number; error: string }
export type ImportResult = { created: number; errors: ImportRowError[] }

/**
 * Parses CSV text into header-keyed row objects, trimming both header names
 * and values -- spreadsheet exports routinely carry stray leading/trailing
 * whitespace that would otherwise silently fail a `required` check or a
 * unique-name match.
 */
export function parseCsvRows(csvText: string): Record<string, string>[] {
  const { data } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  })
  return data
}

/**
 * Parses a loosely-typed boolean column (true/false/yes/no/1/0, any case).
 * An empty cell falls back to the field's own default rather than forcing
 * every row to spell it out; an unrecognized non-empty value is a row error
 * rather than a silent guess.
 */
export function parseCsvBoolean(value: string | undefined, defaultValue: boolean): boolean | 'invalid' {
  if (!value) return defaultValue
  const normalized = value.toLowerCase()
  if (['true', 'yes', '1'].includes(normalized)) return true
  if (['false', 'no', '0'].includes(normalized)) return false
  return 'invalid'
}

/**
 * Parses a numeric column. An empty cell means "not provided" (undefined,
 * so the field's own default/required behavior applies); a non-empty value
 * that isn't a valid number is a row error.
 */
export function parseCsvNumber(value: string | undefined): number | undefined | 'invalid' {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 'invalid'
}

/**
 * Runs `createRow` for every parsed CSV row, continuing past a single row's
 * failure rather than aborting the whole import -- a spreadsheet with 40
 * good rows and 2 bad ones should still create the 40, with the 2 reported
 * by row number (matching what a user sees if they open the file in a
 * spreadsheet app: row 1 is the header, so the first data row is row 2).
 */
export async function runCsvImport(
  rows: Record<string, string>[],
  createRow: (row: Record<string, string>) => Promise<void>,
): Promise<ImportResult> {
  const errors: ImportRowError[] = []
  let created = 0

  for (const [index, row] of rows.entries()) {
    try {
      await createRow(row)
      created++
    } catch (err) {
      errors.push({ row: index + 2, error: err instanceof Error ? err.message : 'Could not import this row' })
    }
  }

  return { created, errors }
}
