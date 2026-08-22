import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { nl } from '@payloadcms/translations/languages/nl'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Bookings } from './collections/Bookings'
import { Closures } from './collections/Closures'
import { Contacts } from './collections/Contacts'
import { LessonTemplates } from './collections/LessonTemplates'
import { Lessons } from './collections/Lessons'
import { Media } from './collections/Media'
import { Programs } from './collections/Programs'
import { Schools } from './collections/Schools'
import { Teachers } from './collections/Teachers'
import { Users } from './collections/Users'
import { SiteSettings } from './globals/SiteSettings'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // Admin UI chrome (buttons, nav, "Save", "Create New", ...) is fully
  // translated by Payload out of the box. Each user picks their own
  // language from their account (top-right avatar menu) —
  // this doesn't require anything per-user to be set up in advance.
  // Field/collection labels are set explicitly per field (see
  // src/collections/*.ts) since those are our own domain vocabulary, not
  // covered by Payload's built-in translation strings.
  i18n: {
    supportedLanguages: { en, nl },
    fallbackLanguage: 'en',
  },
  collections: [
    Users,
    Schools,
    Contacts,
    Teachers,
    Programs,
    LessonTemplates,
    Bookings,
    Lessons,
    Closures,
    Media,
  ],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Payload disables filesystem migration-directory scanning under
    // NODE_ENV=production (a bundled/standalone build can't reliably read
    // a migrations folder at runtime) — prodMigrations statically imports
    // them instead. Regenerate src/migrations/index.ts's import whenever
    // `payload migrate:create` adds a new migration file.
    prodMigrations: migrations,
  }),
  sharp,
  plugins: [],
})
