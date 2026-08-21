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
import { Programs } from './collections/Programs'
import { Schools } from './collections/Schools'
import { Teachers } from './collections/Teachers'
import { Users } from './collections/Users'

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
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Payload disables schema auto-push under NODE_ENV=production by
    // design (real migrations should own schema changes once there's real
    // data to protect) — but no migrations exist yet, so a fresh production
    // deploy would otherwise start against a database with no tables at
    // all ("relation \"users\" does not exist"), exactly what happened on
    // the first real deploy. ALLOW_SCHEMA_PUSH opts a specific environment
    // back into auto-push explicitly; leave it unset once real migrations
    // (`payload migrate:create`) exist and this deployment holds real data.
    push: process.env.NODE_ENV !== 'production' || process.env.ALLOW_SCHEMA_PUSH === 'true',
  }),
  sharp,
  plugins: [],
})
