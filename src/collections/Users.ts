import type { CollectionConfig } from 'payload'

/**
 * Internal staff accounts. Small teams are the expected case, so anyone
 * can manage anyone else's account — at that scale a lockout is a bigger
 * risk than an internal permission boundary.
 *
 * `role` ("admin" | "staff") controls exactly one thing at this stage:
 * organisation-wide, deployment-level configuration (currently just the
 * `site-settings` global — name/logo). Every collection in this app
 * (Schools, Teachers, Programs, Bookings, Lessons, ...) stays gated on
 * `isAuthenticated` regardless of `role` — day-to-day work is the same for
 * every signed-in user. "admin" only adds the organisation-wide surfaces;
 * it does not narrow anything a "staff" user can already do. See the full
 * definition and the access-function contract in `src/access/roles.ts`
 * (`hasAdminRole`/`isAdmin`) and the README's "Roles" section — read it
 * before gating a new surface on this field, rather than re-checking
 * `user.role === 'admin'` inline.
 *
 * `role` is unrelated to the future teacher/school portal phase: a portal
 * account will be its own auth collection with its own access rules, not a
 * third value of this enum.
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
      admin: {
        description:
          '"Admin" adds organisation-wide settings (currently: branding under Globals > Site settings) on top of everything a "Staff" user can already do. It does not restrict day-to-day work -- every signed-in user has full access to Schools, Teachers, Programs, Bookings, and Lessons regardless of role. See src/access/roles.ts for the full definition.',
      },
      options: [
        { label: { en: 'Admin', nl: 'Beheerder' }, value: 'admin' },
        { label: { en: 'Staff', nl: 'Medewerker' }, value: 'staff' },
      ],
    },
    {
      name: 'preferredLanguage',
      type: 'select',
      required: true,
      defaultValue: 'en',
      label: { en: 'Preferred language', nl: 'Voorkeurstaal' },
      admin: {
        description:
          'Language for the front-end planning app (/planning, /schools, /teachers, /programs, /settings) — separate from the admin panel\'s own language picker in the account menu, which only affects /admin.',
      },
      options: [
        { label: { en: 'English', nl: 'Engels' }, value: 'en' },
        { label: { en: 'Dutch', nl: 'Nederlands' }, value: 'nl' },
      ],
    },
  ],
}
