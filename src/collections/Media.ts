import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '../access/roles'

/**
 * Generic upload collection. Currently only used for the organisation's
 * logo (see globals/SiteSettings.ts), but kept generic rather than a
 * one-off "logo" field type so it can serve future upload needs (e.g.
 * PDF export assets) without another schema change.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Media', nl: 'Media' },
    plural: { en: 'Media', nl: "Media" },
  },
  admin: {
    useAsTitle: 'filename',
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
    imageSizes: [{ name: 'thumbnail', width: 200, height: 200, fit: 'inside' }],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: { en: 'Alt text', nl: 'Alt-tekst' },
    },
  ],
}
