import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '../access/roles'

/**
 * Study days, holidays, and other non-lesson blocking entries for a school.
 * In a real scheduling spreadsheet reviewed during design these showed up as
 * rows like "Example School - studiedag" or "vakantie" (Dutch for "holiday")
 * wedged into the lesson list because there was nowhere else to put them.
 * Keeping them as their own entity means the lesson grid stays lessons-only.
 */
export const Closures: CollectionConfig = {
  slug: 'closures',
  labels: {
    singular: { en: 'Closure', nl: 'Sluiting' },
    plural: { en: 'Closures', nl: 'Sluitingen' },
  },
  defaultSort: 'startDate',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['school', 'label', 'startDate', 'endDate'],
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
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
      name: 'label',
      type: 'text',
      required: true,
      label: { en: 'Description', nl: 'Omschrijving' },
      admin: {
        description: 'e.g. "Studiedag" or "Zomervakantie".',
      },
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      label: { en: 'Start date', nl: 'Startdatum' },
      admin: {
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      label: { en: 'End date', nl: 'Einddatum' },
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'Leave blank for a single day.',
      },
    },
  ],
}
