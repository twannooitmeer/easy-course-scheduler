# Legacy spreadsheet import

A one-off (and re-runnable) script that reads a deployment's legacy planning
spreadsheet (Excel or CSV export) and maps it onto this app's own
Schools/Teachers/Programs/Bookings/Lessons/Closures collections.

Nothing about any real deployment (column names, status legend, teacher or
organisation names, school names) lives in this repository. Every deployment
gets its own config file, kept outside this repo, describing how *its* export
maps onto the app's fields.

## Usage

```bash
pnpm import:legacy <source-file.xlsx|.csv> <config-file.ts> [--commit]
```

- `<source-file>` is that deployment's exported spreadsheet, `.xlsx` or `.csv`
  (auto-detected).
- `<config-file>` is a `LegacyImportConfig` (see `types.ts` and
  `example.config.ts`), imported at runtime from wherever you put it. It does
  not need to live inside this repo, or even inside this git worktree, so a
  real deployment's config and source file can sit alongside the vault's
  external-root storage or any other private location.
- Without `--commit`, the script runs in **dry-run mode**: it reads the file,
  resolves every row, and prints a change report, without creating or
  updating a single record. This is the default on purpose, so a first run
  against a new export is always a preview.
- With `--commit`, it performs the same resolution and actually writes.

Example, once a real config exists outside the repo:

```bash
pnpm import:legacy ~/exports/2026-2027.xlsx ~/configs/example-deployment.config.ts
pnpm import:legacy ~/exports/2026-2027.xlsx ~/configs/example-deployment.config.ts --commit
```

## Writing a config

Copy `example.config.ts` outside this repository and adjust every field to
match the real deployment:

- `columns` maps this app's own fields onto that deployment's actual column
  headers (matched case-insensitively, trimmed).
- `statusMap` / `soortMap` translate the deployment's own status and
  soort/category text into this app's canonical enum values. A value with no
  entry in the map is a row error, never a silent guess.
- `closureKeywords` marks a row as a study day/holiday (a `Closure`) instead
  of a real lesson.
- `organisationTeacherNames` marks which teacher names are actually an
  organisation rather than a person.
- `teacherSeparator` splits a multi-teacher free-text cell into individual
  names.
- `parseDate` overrides the default date parser (ISO, or day-first
  `d-m-yyyy`/`d/m/yyyy`) for a deployment whose export uses another format.

Every field is documented in `types.ts`.

## Identity and idempotency

Running the same import twice, or re-running it against an updated export of
the same spreadsheet, is always safe:

- **Schools, Teachers, Programs** are identified by their existing unique
  `name`/`displayName`. An existing record is reused; a new one is only
  created the first time its name is seen.
- **Bookings and Closures** are identified by a deterministic `importRef`
  derived from their own defining fields (school, program, group label,
  date), stored on the record. Since identity IS the defining fields, an
  existing Booking or Closure can never need an update from a re-run: it is
  either found (skipped) or created.
- **Lessons** are identified by `importRef` too, but unlike Bookings and
  Closures they are diffed field by field against the source row and
  updated when something legitimately changed between two exports (a status
  moved forward, a date got rescheduled, a headcount changed). Nothing is
  ever duplicated.
- When a source row already carries its own stable identifier (an
  `rowId` column, e.g. the spreadsheet's own row number or an export ID),
  configure `columns.rowId` so that value becomes the `importRef` directly.
  This is the more robust choice whenever the source file actually has one.

The `importRef` field on Bookings/Closures/Lessons is set only by this
script; it stays empty on every record created through the app itself, and
is read-only in the admin panel.

## Validation

Every row is mapped independently (`mapRow.ts`), and a row that fails
mapping (missing school/program, an unparsable date, an unrecognized status
or soort, an invalid time) is collected as a row error and skipped. Row
errors never stop the rest of the import, and are always listed at the end
of the change report with the row number (matching what a spreadsheet
application shows, header included) and the reason.

## Change report

Both a dry run and a `--commit` run print the same report: how many rows
were read, which Schools/Teachers/Programs would be (or were) created, how
many Bookings/Closures/Lessons would be (or were) created, how many Lessons
are unchanged from an earlier import, exactly which Lessons would be (or
were) updated and which fields changed, and the full list of row errors.
Read the dry-run report before ever passing `--commit`.

## Tests

- `tests/int/legacyImportNormalize.int.spec.ts`, `legacyImportMapRow.int.spec.ts`
  and `legacyImportReport.int.spec.ts` are pure unit tests (no database) over
  `normalize.ts`, `mapRow.ts` and `report.ts`.
- `tests/int/legacyImport.int.spec.ts` runs the full `runLegacyImport`
  against a real Payload/Postgres instance using the synthetic fixtures in
  `fixtures/`, covering dry-run vs. `--commit`, entity resolution/creation,
  and idempotent re-runs (including an update-only re-run against
  `fixtures/example-source-updated.csv`).

## A note on why this script exists

An earlier, deployment-specific version of this import hardcoded one real
deployment's column names, status legend and organisation names directly
into this public repository. This generic, config-driven version replaces
it: nothing about any real deployment belongs in the repo, only in a config
file that lives outside it.
