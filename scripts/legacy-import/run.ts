import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { getPayload } from 'payload'

import config from '../../src/payload.config'
import { runLegacyImport } from './importer'
import { parseWorkbook } from './parseWorkbook'
import { formatReport } from './report'
import type { LegacyImportConfig } from './types'

/**
 * CLI entrypoint: `pnpm import:legacy <source.xlsx|.csv> <config.ts> [--commit]`.
 *
 * Dry-run by default — prints what would change without writing anything.
 * Pass --commit to actually apply it. Safe to run repeatedly: every
 * created Booking/Lesson/Closure carries a deterministic `importRef`, so a
 * second run against the same file is a no-op, and a re-run against an
 * updated export of the same spreadsheet only touches the rows that
 * actually changed. See README.md in this directory.
 */
async function main() {
  const args = process.argv.slice(2)
  const commit = args.includes('--commit')
  const positional = args.filter((arg) => !arg.startsWith('--'))
  const [sourcePath, configPath] = positional

  if (!sourcePath || !configPath) {
    console.error('Usage: pnpm import:legacy <source-file.xlsx|.csv> <config-file.ts> [--commit]')
    console.error('See scripts/legacy-import/README.md and example.config.ts.')
    process.exitCode = 1
    return
  }

  const resolvedConfigPath = path.resolve(process.cwd(), configPath)
  const configModule = (await import(pathToFileURL(resolvedConfigPath).href)) as {
    default?: LegacyImportConfig
    config?: LegacyImportConfig
  }
  const importConfig = configModule.default ?? configModule.config
  if (!importConfig) {
    console.error(`${configPath} must export a default (or named "config") LegacyImportConfig.`)
    process.exitCode = 1
    return
  }

  const resolvedSourcePath = path.resolve(process.cwd(), sourcePath)
  const rows = parseWorkbook(resolvedSourcePath)

  const payload = await getPayload({ config })
  try {
    const report = await runLegacyImport(payload, importConfig, rows, { commit })
    console.log(formatReport(report))
    if (!commit) {
      console.log('\nThis was a dry run — nothing was written. Re-run with --commit to apply it.')
    }
  } finally {
    await payload.destroy()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
