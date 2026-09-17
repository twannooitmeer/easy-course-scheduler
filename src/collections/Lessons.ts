import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '../access/roles'
import { notifyOnLessonStatusChange } from '../notifications/statusChangeHooks'

/**
 * A single planned lesson, generated from a Booking's Program template and
 * then freely editable — date, time, teacher(s), location, status all live
 * here independent of the template afterward.
 *
 * `teachers` is a hasMany relationship on purpose: a real scheduling spreadsheet reviewed during design has
 * lessons co-taught by two named teachers in one free-text field, and others
 * led by an organisation instead of a person (see Teachers.ts). A single FK
 * couldn't represent either case.
 */
export const Lessons: CollectionConfig = {
  slug: 'lessons',
  labels: {
    singular: { en: 'Lesson', nl: 'Les' },
    plural: { en: 'Lessons', nl: 'Lessen' },
  },
  defaultSort: 'lessonDate',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['booking', 'sequenceNo', 'lessonDate', 'groupLabel', 'status'],
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [notifyOnLessonStatusChange],
  },
  fields: [
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
      required: true,
      index: true,
      label: { en: 'Booking', nl: 'Inschrijving' },
    },
    {
      name: 'sequenceNo',
      type: 'number',
      required: true,
      min: 1,
      label: { en: 'Sequence number', nl: 'Volgnummer' },
    },
    {
      name: 'lessonDate',
      type: 'date',
      required: true,
      index: true,
      label: { en: 'Lesson date', nl: 'Lesdatum' },
      admin: {
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'startTime',
      type: 'date',
      label: { en: 'Start time', nl: 'Starttijd' },
      admin: {
        date: { pickerAppearance: 'timeOnly' },
      },
    },
    {
      name: 'endTime',
      type: 'date',
      label: { en: 'End time', nl: 'Eindtijd' },
      admin: {
        date: { pickerAppearance: 'timeOnly' },
      },
    },
    {
      name: 'groupLabel',
      type: 'text',
      label: { en: 'Group', nl: 'Groep' },
      admin: {
        description: 'Copied from the booking at generation time; editable per lesson.',
      },
    },
    {
      name: 'teachers',
      type: 'relationship',
      relationTo: 'teachers',
      hasMany: true,
      index: true,
      label: { en: 'Teachers', nl: 'Docenten' },
    },
    {
      name: 'location',
      type: 'text',
      label: { en: 'Location', nl: 'Locatie' },
      admin: {
        description: 'Overrides the school\'s default location note for this lesson only.',
      },
    },
    {
      name: 'studentCount',
      type: 'number',
      min: 0,
      label: { en: 'Student count', nl: 'Aantal leerlingen' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'nieuw',
      label: { en: 'Status', nl: 'Status' },
      options: [
        { label: 'Nieuw', value: 'nieuw' },
        { label: 'Aangevraagd bij docent', value: 'aangevraagd_docent' },
        { label: 'Akkoord docent', value: 'akkoord_docent' },
        { label: 'Akkoord school', value: 'akkoord_school' },
      ],
    },
    {
      name: 'soortOverride',
      type: 'select',
      label: { en: 'Soort (override)', nl: 'Soort (afwijkend)' },
      options: [
        { label: 'Regulier', value: 'regulier' },
        { label: 'Maatwerk', value: 'maatwerk' },
        { label: 'CMK', value: 'cmk' },
        { label: 'KBW', value: 'kbw' },
      ],
      admin: {
        description: 'Only set this for the rare lesson that genuinely differs from its program\'s soort.',
      },
    },
    {
      name: 'remark',
      type: 'textarea',
      label: { en: 'Remark', nl: 'Opmerking' },
    },
    {
      name: 'importRef',
      type: 'text',
      unique: true,
      index: true,
      label: { en: 'Import reference', nl: 'Importreferentie' },
      admin: {
        position: 'sidebar',
        description:
          'Set only by the legacy-spreadsheet import script (scripts/legacy-import/) to identify which source row this lesson came from, so a later re-run of the same import updates it instead of creating a duplicate. Empty for every lesson generated or created through the app itself.',
        readOnly: true,
      },
    },
  ],
}
