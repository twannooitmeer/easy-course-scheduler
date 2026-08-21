import type { CollectionConfig } from 'payload'

/**
 * Internal staff accounts. Small teams are the expected case, so anyone
 * can manage anyone else's account — at that scale a lockout is a bigger
 * risk than an internal permission boundary. A `role` field is kept for a
 * later teacher/school portal phase, which will need a real access-control
 * split.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { en: 'User', nl: 'Gebruiker' },
    plural: { en: 'Users', nl: 'Gebruikers' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
  },
  auth: true,
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { en: 'Name', nl: 'Naam' },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'staff',
      label: { en: 'Role', nl: 'Rol' },
      options: [
        { label: { en: 'Admin', nl: 'Beheerder' }, value: 'admin' },
        { label: { en: 'Staff', nl: 'Medewerker' }, value: 'staff' },
      ],
    },
  ],
}
