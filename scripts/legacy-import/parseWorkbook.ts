import * as XLSXModule from 'xlsx'

// `xlsx` is published as CJS with no `exports` map; under this project's
// `"type": "module"`, Node's CJS/ESM interop puts its actual API behind a
// synthetic `default` in some runtimes (tsx included) and directly on the
// namespace in others. Normalizing once here avoids the whole module
// silently resolving to an object with no `readFile`.
const XLSX = ((XLSXModule as unknown as { default?: typeof XLSXModule }).default ?? XLSXModule) as typeof XLSXModule

/**
 * Reads the first sheet of an .xlsx or .csv file into header-keyed row
 * objects. `xlsx` (SheetJS) auto-detects the format from the file itself,
 * so one code path covers both — a deployment can hand this either an
 * Excel export or a plain CSV export of the same spreadsheet.
 *
 * `raw: true` matters specifically for CSV/plain-text input: without it,
 * SheetJS "value-forces" any date-looking cell text (e.g. an ISO
 * `"2026-09-01"` column) into a serial number and re-renders it through its
 * own default `m/d/yy` format, silently turning that same cell into the
 * ambiguous `"9/1/26"` — which normalize.ts's date parser then correctly
 * refuses to guess at. `raw: true` disables that inference for CSV, so the
 * source file's own text comes through byte-for-byte. It has no effect on a
 * genuine .xlsx file's own typed cells, which is what `cellDates: true`
 * handles below: a real Excel date cell becomes a JS `Date` (handled in the
 * loop below) instead of a raw serial number or a locale-dependent
 * formatted string.
 *
 * Every value comes back as a trimmed string, cell type included (dates,
 * numbers, ...) — mapRow.ts and its configured statusMap/soortMap/
 * closureKeywords all match on trimmed text, so this keeps one
 * normalization point instead of repeating `String(x).trim()` at every
 * call site.
 */
export function parseWorkbook(filePath: string): Record<string, string>[] {
  const workbook = XLSX.readFile(filePath, { raw: true, cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })

  return rows.map((row) => {
    const trimmedRow: Record<string, string> = {}
    for (const [header, value] of Object.entries(row)) {
      trimmedRow[header.trim()] = cellToString(value)
    }
    return trimmedRow
  })
}

/** Formats a genuine Excel date cell (from `cellDates: true`) as `yyyy-mm-dd` so normalize.ts's default ISO parser handles it; everything else is trimmed text. */
function cellToString(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim()
}
