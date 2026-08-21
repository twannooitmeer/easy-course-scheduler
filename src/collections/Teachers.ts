import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '../access/roles'

/**
 * A "teacher" is often not one person: a real scheduling spreadsheet
 * reviewed during design mixed individual teachers, co-teaching duos named
 * in a single free-text field ("Person A en Person B" — Dutch for "and"),
 * and organisations standing in as the teacher of record. `kind` records
 * which shape a given record is; co-teaching is handled by letting a Lesson
 * carry more than one Teacher (see Lessons.ts), not by this collection.
 */
export const Teachers: CollectionConfig = {
  slug: 'teachers',
  labels: {
    singular: { en: 'Teacher', nl: 'Docent' },
    plural: { en: 'Teachers', nl: 'Docenten' },
  },
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'kind', 'email', 'phone'],
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'displayName',
      type: 'text',
      required: true,
      unique: true,
      label: { en: 'Name', nl: 'Naam' },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'person',
      label: { en: 'Type', nl: 'Type' },
      options: [
        { label: { en: 'Person', nl: 'Persoon' }, value: 'person' },
        { label: { en: 'Organisation', nl: 'Organisatie' }, value: 'organisation' },
      ],
    },
    {
      name: 'email',
      type: 'email',
      label: { en: 'Email', nl: 'E-mail' },
    },
    {
      name: 'phone',
      type: 'text',
      label: { en: 'Phone', nl: 'Telefoonnummer' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: { en: 'Active', nl: 'Actief' },
    },
  ],
}
