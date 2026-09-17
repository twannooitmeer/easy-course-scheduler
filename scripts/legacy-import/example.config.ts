import type { LegacyImportConfig } from './types'

/**
 * Fully worked example configuration, matching the shape of a real
 * deployment's legacy scheduling spreadsheet — but with entirely
 * synthetic column names, values, and organisation names throughout.
 *
 * To configure a real deployment: copy this file OUTSIDE this repository
 * (e.g. into that deployment's own private config, or a git-ignored local
 * path), then adjust every field below to match that deployment's actual
 * export — its real column headers, its real status/soort legend, its
 * real organisation-teacher names, its real closure keywords. Never commit
 * a real deployment's config (or its source spreadsheet) into this public
 * repo — that is exactly the mistake this script replaces (see this
 * project's README/wiki history on the data-exposure incident that
 * deleted the previous, hardcoded version of this script).
 */
const config: LegacyImportConfig = {
  deploymentLabel: 'Example Deployment 2026-2027',

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
    // rowId: 'Rij-ID', // uncomment if the real export has a stable per-row id column
  },

  // Splits a cell like "Jane Doe en John Roe" into two teacher names.
  teacherSeparator: ' en ',

  // Synthetic examples only — replace with the real deployment's own
  // organisation-as-teacher names, never a real one committed here.
  organisationTeacherNames: ['Voorbeeld Cultuurhuis', 'Voorbeeld Theatergroep'],

  // Keys must be lowercase; the script lowercases each row's raw value
  // before looking it up here.
  statusMap: {
    nieuw: 'nieuw',
    aangevraagd: 'aangevraagd_docent',
    'aangevraagd bij docent': 'aangevraagd_docent',
    'akkoord docent': 'akkoord_docent',
    'akkoord school': 'akkoord_school',
  },

  soortMap: {
    regulier: 'regulier',
    maatwerk: 'maatwerk',
    cmk: 'cmk',
    kbw: 'kbw',
  },

  // Substrings (case-insensitive) that mark a row as a closure rather than
  // a real lesson.
  closureKeywords: ['studiedag', 'vakantie'],

  defaultCountry: 'Nederland',

  // No `parseDate` override: the default parser accepts ISO (yyyy-mm-dd)
  // and day-first d-m-yyyy / d/m/yyyy, which covers this example file.
}

export default config
