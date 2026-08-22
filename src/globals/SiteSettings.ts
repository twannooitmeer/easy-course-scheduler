import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/roles'

/**
 * Organisation-wide branding: the name and logo shown in the front-end
 * nav (AppNav.tsx) instead of the hardcoded "Easy Course Scheduler".
 * A Global, not a collection, since there's exactly one of these per
 * deployment — admin-only, edited from Payload's own admin panel
 * (/admin/globals/site-settings), the same place the rest of the
 * genuinely one-time/rare configuration already lives.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: { en: 'Site settings', nl: 'Site-instellingen' },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'organisationName',
      type: 'text',
      label: { en: 'Organisation name', nl: 'Organisatienaam' },
      admin: {
        description: 'Shown in the left nav instead of "Easy Course Scheduler". Leave blank to use the default.',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Logo', nl: 'Logo' },
      admin: {
        description: 'Shown in the left nav next to (or instead of) the organisation name.',
      },
    },
  ],
}
