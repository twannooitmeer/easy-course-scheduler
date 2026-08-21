import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '../access/roles'

export const Contacts: CollectionConfig = {
  slug: 'contacts',
  labels: {
    singular: { en: 'Contact', nl: 'Contactpersoon' },
    plural: { en: 'Contacts', nl: 'Contactpersonen' },
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'school', 'email', 'phone'],
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
      label: { en: 'Full name', nl: 'Volledige naam' },
    },
    {
      name: 'firstName',
      type: 'text',
      label: { en: 'First name', nl: 'Voornaam' },
    },
    {
      name: 'lastName',
      type: 'text',
      label: { en: 'Last name', nl: 'Achternaam' },
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
      name: 'school',
      type: 'relationship',
      relationTo: 'schools',
      required: true,
      index: true,
      label: { en: 'School', nl: 'School' },
    },
  ],
}
