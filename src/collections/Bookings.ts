import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '../access/roles'
import { generateLessonsFromBooking } from '../hooks/generateLessonsFromBooking'

/**
 * A School booked onto a Program. Creating a Booking is the trigger that
 * stamps out real Lesson rows from the Program's lesson templates (see
 * generateLessonsFromBooking.ts) — auto-populate, then hand-edit.
 *
 * `status` replaces a legacy spreadsheet's manual cell-colour legend
 * (blauw/oranje/groen/wit) with a real, filterable field. The option labels
 * stay in Dutch in both languages on purpose — they're this example deployment's own
 * workflow vocabulary, not English terms needing translation.
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: {
    singular: { en: 'Booking', nl: 'Inschrijving' },
    plural: { en: 'Bookings', nl: 'Inschrijvingen' },
  },
  defaultSort: '-startDate',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['school', 'program', 'groupLabel', 'startDate', 'status'],
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    afterChange: [generateLessonsFromBooking],
  },
  fields: [
    {
      name: 'school',
      type: 'relationship',
      relationTo: 'schools',
      required: true,
      index: true,
      label: { en: 'School', nl: 'School' },
    },
    {
      name: 'program',
      type: 'relationship',
      relationTo: 'programs',
      required: true,
      index: true,
      label: { en: 'Program', nl: 'Programma' },
    },
    {
      name: 'groupLabel',
      type: 'text',
      label: { en: 'Group', nl: 'Groep' },
      admin: {
        description: 'Class/group, e.g. "3a" or "6/7". Free text on purpose — the real data mixes plain numbers and labels.',
      },
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      label: { en: 'Start date', nl: 'Startdatum' },
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'Used to space out the generated lessons; edit individual lesson dates afterward as needed.',
      },
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
      admin: {
        description: 'Replaces the old blauw/oranje/groen/wit cell-colour legend with a real, filterable field.',
      },
    },
    {
      name: 'note',
      type: 'textarea',
      label: { en: 'Note', nl: 'Notitie' },
    },
  ],
}
