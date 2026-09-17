import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // Payload's local API + Postgres adapter can take a moment to init per file.
    testTimeout: 20000,
    hookTimeout: 20000,
    // Every int spec runs against the same live dev Postgres database (see
    // any spec's own beforeAll comment) and several specs' beforeAll clears
    // whole shared collections (schools/teachers/programs/bookings/lessons).
    // Running spec files in parallel lets two files' cleanup/writes race on
    // the same rows, which surfaces as a genuine Postgres deadlock
    // ("current transaction is aborted") rather than a real bug in either
    // spec. Forcing file execution to be sequential removes that race.
    fileParallelism: false,
  },
})
