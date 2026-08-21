import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '../access/roles'

/**
 * A Program is the reusable template: a named lesson series (e.g. "Ik wou
 * dat ik een vogel was"), usually with one default teacher and a fixed
 * number of lesson slots. Booking a School onto a Program is what
 * stamps out real Lesson rows — see Bookings.ts.
 *
 * `soort` lives here, not on individual lessons: in a real scheduling spreadsheet reviewed during design it
 * was only filled on 89 of 1,302 rows because it describes the programme,
 * not the lesson. It defaults onto every generated Lesson (Lessons.ts has a
 * `soortOverride` for the rare exception). The option labels stay
 * untranslated on purpose — regulier/maatwerk/CMK/KBW are that example deployment's
 * own Dutch domain terms, not English words needing a Dutch translation.
 */
export const Programs: CollectionConfig = {
  slug: 'programs',
  labels: {
    singular: { en: 'Program', nl: 'Programma' },
    plural: { en: 'Programs', nl: "Programma's" },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'soort', 'defaultLessonCount', 'price'],
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { en: 'Name', nl: 'Naam' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: { en: 'Description', nl: 'Omschrijving' },
    },
    {
      name: 'soort',
      type: 'select',
      label: { en: 'Soort', nl: 'Soort' },
      options: [
        { label: 'Regulier', value: 'regulier' },
        { label: 'Maatwerk', value: 'maatwerk' },
        { label: 'CMK', value: 'cmk' },
        { label: 'KBW', value: 'kbw' },
      ],
      admin: {
        description:
          'Defaults onto every lesson generated from this program. Deferred: whether this feeds subsidy reporting is an open question for after the MVP.',
      },
    },
    {
      name: 'defaultLessonCount',
      type: 'number',
      min: 1,
      label: { en: 'Default lesson count', nl: 'Standaard aantal lessen' },
      admin: {
        description:
          'How many lesson slots a booking of this program generates by default. Informational once lesson templates exist below — the templates are the actual source of truth.',
      },
    },
    {
      name: 'defaultLessonDurationMinutes',
      type: 'number',
      min: 1,
      defaultValue: 60,
      label: { en: 'Default lesson duration (minutes)', nl: 'Standaardduur (minuten)' },
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      label: { en: 'Price', nl: 'Prijs' },
      admin: {
        description: 'Price in euros for the full program.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: { en: 'Active', nl: 'Actief' },
    },
  ],
}
