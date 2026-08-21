import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '../access/roles'

/**
 * One row per lesson slot inside a Program (sequence 1..N). When a School is
 * booked onto the Program, one Lesson is generated per LessonTemplate — see
 * the `generateLessonsFromBooking` hook on Bookings.ts.
 */
export const LessonTemplates: CollectionConfig = {
  slug: 'lesson-templates',
  labels: {
    singular: { en: 'Lesson Template', nl: 'Lesmodel' },
    plural: { en: 'Lesson Templates', nl: 'Lesmodellen' },
  },
  defaultSort: 'sequenceNo',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['program', 'sequenceNo', 'durationMinutes', 'defaultTeacher'],
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'program',
      type: 'relationship',
      relationTo: 'programs',
      required: true,
      index: true,
      label: { en: 'Program', nl: 'Programma' },
    },
    {
      name: 'sequenceNo',
      type: 'number',
      required: true,
      min: 1,
      label: { en: 'Sequence number', nl: 'Volgnummer' },
      admin: {
        description: 'Position of this lesson within the program (1, 2, 3, ...).',
      },
    },
    {
      name: 'durationMinutes',
      type: 'number',
      min: 1,
      defaultValue: 60,
      label: { en: 'Duration (minutes)', nl: 'Duur (minuten)' },
    },
    {
      name: 'defaultTeacher',
      type: 'relationship',
      relationTo: 'teachers',
      label: { en: 'Default teacher', nl: 'Standaard docent' },
      admin: {
        description: 'Pre-fills the teacher on every generated lesson; still editable per lesson.',
      },
    },
  ],
}
