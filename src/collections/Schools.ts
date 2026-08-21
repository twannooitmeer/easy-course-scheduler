import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '../access/roles'

/**
 * A real school, picked from a list rather than typed free-hand. This is the
 * direct fix for a real spreadsheet's messiest problem seen during design:
 * the same school ends up as several unrelated strings ("Example School" vs
 * "Example School " vs "Example School-studiedag") purely from typing drift
 * and ad hoc suffixes, once nothing forces a name to be picked from a list.
 */
export const Schools: CollectionConfig = {
  slug: 'schools',
  labels: {
    singular: { en: 'School', nl: 'School' },
    plural: { en: 'Schools', nl: 'Scholen' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'phone'],
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
      unique: true,
      label: { en: 'Name', nl: 'Naam' },
    },
    {
      name: 'street',
      type: 'text',
      label: { en: 'Street', nl: 'Straat' },
    },
    {
      name: 'houseNumber',
      type: 'text',
      label: { en: 'House number', nl: 'Huisnummer' },
    },
    {
      name: 'addition',
      type: 'text',
      label: { en: 'Addition', nl: 'Toevoeging' },
      admin: {
        description: 'House number addition, e.g. "A" or "-1".',
      },
    },
    {
      name: 'postalCode',
      type: 'text',
      label: { en: 'Postal code', nl: 'Postcode' },
    },
    {
      name: 'city',
      type: 'text',
      label: { en: 'City', nl: 'Stad' },
    },
    {
      name: 'country',
      type: 'text',
      defaultValue: 'Nederland',
      label: { en: 'Country', nl: 'Land' },
    },
    {
      name: 'phone',
      type: 'text',
      label: { en: 'Phone', nl: 'Telefoonnummer' },
    },
    {
      name: 'defaultLocationNote',
      type: 'text',
      label: { en: 'Default location', nl: 'Standaardlocatie' },
      admin: {
        description:
          'Default room/location for lessons at this school (e.g. "in de klas", "gymlokaal"). Each lesson can still override it.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: { en: 'Notes', nl: 'Notities' },
    },
  ],
}
