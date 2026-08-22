import { expect, test } from '@playwright/test'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

import config from '../../src/payload.config'

const TEST_USER_EMAIL = 'e2e-masterdata@example.com'
const TEST_USER_PASSWORD = 'e2e-masterdata-password-123'
const SCHOOL_NAME = 'E2E Masterdata School'
const TEACHER_NAME = 'E2E Masterdata Teacher'
const PROGRAM_NAME = 'E2E Masterdata Program'
const BOOKINGS_SCHOOL_NAME = `${SCHOOL_NAME} Bookings`
const BOOKINGS_PROGRAM_NAME = `${PROGRAM_NAME} Bookings`
const BOOKING_GROUP = 'e2e-masterdata-group'
const DUPLICATE_SCHOOL_NAME = `${SCHOOL_NAME} Duplicate`
const DUPLICATE_TEACHER_NAME = `${TEACHER_NAME} Duplicate`
const DUPLICATE_PROGRAM_NAME = `${PROGRAM_NAME} Duplicate`
const SEARCH_SCHOOL_NAME = `${SCHOOL_NAME} Zebra`
const PAGINATION_SCHOOL_PREFIX = `${SCHOOL_NAME} Pagination`
const BULK_SCHOOL_PREFIX = `${SCHOOL_NAME} Bulk`
const IMPORT_SCHOOL_PREFIX = `${SCHOOL_NAME} Import`
const IMPORT_TEACHER_PREFIX = `${TEACHER_NAME} Import`
const IMPORT_PROGRAM_PREFIX = `${PROGRAM_NAME} Import`

let payload: Payload

/**
 * Same rationale as planning.spec.ts's cleanup: without deleting the
 * previous run's fixtures first, a second run accumulates duplicate rows
 * and a name-scoped locator starts matching more than one.
 */
async function cleanUpPreviousRun() {
  const schools = await payload.find({ collection: 'schools', where: { name: { contains: SCHOOL_NAME } } })
  const teachers = await payload.find({ collection: 'teachers', where: { displayName: { contains: TEACHER_NAME } } })
  const programs = await payload.find({ collection: 'programs', where: { name: { contains: PROGRAM_NAME } } })

  if (schools.docs.length > 0) {
    const schoolIds = schools.docs.map((s) => s.id)
    const bookings = await payload.find({ collection: 'bookings', where: { school: { in: schoolIds } }, limit: 1000 })
    const bookingIds = bookings.docs.map((b) => b.id)
    if (bookingIds.length > 0) {
      await payload.delete({ collection: 'lessons', where: { booking: { in: bookingIds } } })
      await payload.delete({ collection: 'bookings', where: { id: { in: bookingIds } } })
    }
    await payload.delete({ collection: 'contacts', where: { school: { in: schoolIds } } })
    await payload.delete({ collection: 'schools', where: { id: { in: schoolIds } } })
  }

  if (teachers.docs.length > 0) {
    await payload.delete({ collection: 'teachers', where: { id: { in: teachers.docs.map((t) => t.id) } } })
  }

  if (programs.docs.length > 0) {
    const programIds = programs.docs.map((p) => p.id)
    await payload.delete({ collection: 'lesson-templates', where: { program: { in: programIds } } })
    await payload.delete({ collection: 'programs', where: { id: { in: programIds } } })
  }
}

test.beforeAll(async () => {
  payload = await getPayload({ config })
  await cleanUpPreviousRun()

  const existingUser = await payload.find({ collection: 'users', where: { email: { equals: TEST_USER_EMAIL } } })
  if (existingUser.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        name: 'E2E Masterdata User',
        role: 'admin',
        preferredLanguage: 'en',
      },
    })
  } else {
    // Other suites/manual testing may have left this on a different
    // language; each test that depends on English copy should not have to
    // guess the starting state.
    await payload.update({
      collection: 'users',
      id: existingUser.docs[0].id,
      data: { preferredLanguage: 'en' },
    })
  }

  // Dedicated fixture for the Bookings sub-section test, kept separate
  // from the school/teacher/program the other tests create through the
  // UI so this doesn't depend on their run order.
  const bookingsSchool = await payload.create({ collection: 'schools', data: { name: BOOKINGS_SCHOOL_NAME } })
  const bookingsProgram = await payload.create({ collection: 'programs', data: { name: BOOKINGS_PROGRAM_NAME } })
  await payload.create({
    collection: 'bookings',
    data: {
      school: bookingsSchool.id,
      program: bookingsProgram.id,
      groupLabel: BOOKING_GROUP,
      startDate: '2027-02-01T00:00:00.000Z',
      status: 'nieuw',
    },
  })

  // Dedicated fixtures for the duplicate-name and search tests, created
  // directly rather than through the other tests' UI flow so these two
  // don't depend on run order either.
  await payload.create({ collection: 'schools', data: { name: DUPLICATE_SCHOOL_NAME } })
  await payload.create({ collection: 'teachers', data: { displayName: DUPLICATE_TEACHER_NAME, kind: 'person' } })
  await payload.create({ collection: 'programs', data: { name: DUPLICATE_PROGRAM_NAME } })
  await payload.create({ collection: 'schools', data: { name: SEARCH_SCHOOL_NAME, city: 'Zebratown' } })

  // 21 schools sharing one name prefix -- searching for that prefix
  // scopes the Schools list to exactly this fixture set, so the
  // pagination test's "page 1 of 2" math doesn't depend on how many
  // other schools this shared dev DB happens to have.
  for (let i = 1; i <= 21; i++) {
    await payload.create({
      collection: 'schools',
      data: { name: `${PAGINATION_SCHOOL_PREFIX} ${String(i).padStart(2, '0')}` },
    })
  }

  // 3 schools sharing a different prefix, for the bulk-delete test --
  // kept separate from the pagination fixture so "select all" only
  // ever needs to reason about one page of results.
  for (let i = 1; i <= 3; i++) {
    await payload.create({
      collection: 'schools',
      data: { name: `${BULK_SCHOOL_PREFIX} ${i}` },
    })
  }
})

test.afterAll(async () => {
  await payload.destroy()
})

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(TEST_USER_EMAIL)
  await page.getByLabel('Password').fill(TEST_USER_PASSWORD)
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/users/login') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /login/i }).click(),
  ])
  await page.waitForURL(/\/admin(?!\/login)/)
}

test('creates a school, edits it on its own detail page, and the edit persists on reload', async ({ page }) => {
  await signIn(page)
  await page.goto('/schools')

  await page.getByRole('button', { name: '+ New school' }).click()
  const dialog = page.locator('dialog.new-booking-dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Name').fill(SCHOOL_NAME)

  await Promise.all([
    page.waitForURL(/\/schools\/\d+$/),
    dialog.getByRole('button', { name: 'Create school' }).click(),
  ])

  await expect(page.getByRole('heading', { name: SCHOOL_NAME })).toBeVisible()

  const cityInput = page.locator('.record-form').getByLabel('City')
  await cityInput.fill('Amsterdam')
  await cityInput.blur()
  await expect(page.getByText('Saved')).toBeVisible()

  await page.reload()
  await expect(page.locator('.record-form').getByLabel('City')).toHaveValue('Amsterdam')

  // Add a contact, then remove it through the shared confirm dialog --
  // every destructive action in the app goes through that, not a bare
  // single click.
  await page.getByRole('button', { name: '+ Add contact' }).click()
  const contactDialog = page.locator('dialog.new-booking-dialog')
  await contactDialog.getByLabel('Full name').fill('E2E Contact Person')
  await Promise.all([
    page.waitForResponse((res) => res.url().includes(`/schools/`) && res.request().method() === 'POST'),
    contactDialog.getByRole('button', { name: 'Add contact' }).click(),
  ])
  const contactRow = page.locator('table.sub-table tbody tr', { hasText: 'E2E Contact Person' })
  await expect(contactRow).toBeVisible()

  await contactRow.getByRole('button', { name: 'Remove contact' }).click()
  await page.locator('dialog.confirm-dialog').getByRole('button', { name: 'Remove' }).click()
  await expect(contactRow).toBeHidden()
})

test('creates a teacher, edits it on its own detail page, and deletes it with a confirm dialog', async ({ page }) => {
  await signIn(page)
  await page.goto('/teachers')

  await page.getByRole('button', { name: '+ New teacher' }).click()
  const dialog = page.locator('dialog.new-booking-dialog')
  await dialog.getByLabel('Name').fill(TEACHER_NAME)

  await Promise.all([
    page.waitForURL(/\/teachers\/\d+$/),
    dialog.getByRole('button', { name: 'Create teacher' }).click(),
  ])

  await expect(page.getByRole('heading', { name: TEACHER_NAME })).toBeVisible()

  const phoneInput = page.locator('.record-form').getByLabel('Phone')
  await phoneInput.fill('0612345678')
  await phoneInput.blur()
  await expect(page.getByText('Saved')).toBeVisible()

  await page.reload()
  await expect(page.locator('.record-form').getByLabel('Phone')).toHaveValue('0612345678')

  await page.goto('/teachers')
  // A plain `hasText: TEACHER_NAME` substring-matches the DUPLICATE_TEACHER_NAME
  // fixture too ("... Teacher" vs "... Teacher Duplicate") -- match the row
  // whose name cell is exactly TEACHER_NAME instead.
  const teacherRow = page
    .locator('table.record-table tbody tr')
    .filter({ has: page.locator('td').filter({ hasText: new RegExp(`^${TEACHER_NAME}$`) }) })
  await teacherRow.getByRole('button', { name: 'Remove teacher' }).click()
  await page.locator('dialog.confirm-dialog').getByRole('button', { name: 'Remove' }).click()
  await expect(teacherRow).toBeHidden()
})

test('creates a program and manages its lesson templates from the detail page', async ({ page }) => {
  await signIn(page)
  await page.goto('/programs')

  await page.getByRole('button', { name: '+ New program' }).click()
  const dialog = page.locator('dialog.new-booking-dialog')
  await dialog.getByLabel('Name').fill(PROGRAM_NAME)

  await Promise.all([
    page.waitForURL(/\/programs\/\d+$/),
    dialog.getByRole('button', { name: 'Create program' }).click(),
  ])

  await expect(page.getByRole('heading', { name: PROGRAM_NAME })).toBeVisible()
  await expect(page.getByText('No lessons yet.')).toBeVisible()

  await page.getByRole('button', { name: '+ Add lesson' }).click()
  const lessonDialog = page.locator('dialog.new-booking-dialog')
  await Promise.all([
    page.waitForResponse((res) => res.url().includes(`/programs/`) && res.request().method() === 'POST'),
    lessonDialog.getByRole('button', { name: 'Add lesson' }).click(),
  ])
  const lessonRow = page.locator('table.sub-table tbody tr')
  await expect(lessonRow).toHaveCount(1)

  await lessonRow.getByRole('button', { name: 'Remove lesson' }).click()
  await page.locator('dialog.confirm-dialog').getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('No lessons yet.')).toBeVisible()
})

test('switching language in Settings translates the nav immediately and persists across reload', async ({ page }) => {
  await signIn(page)
  await page.goto('/settings')

  await expect(page.getByRole('link', { name: 'Schools', exact: true })).toBeVisible()

  await page.getByLabel('Language').selectOption('nl')
  await expect(page.getByText('Opgeslagen')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Scholen', exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('link', { name: 'Scholen', exact: true })).toBeVisible()

  // Restore English so this suite's other tests (and a human re-running
  // it manually) see the copy they expect.
  await page.getByLabel('Taal').selectOption('en')
  await expect(page.getByRole('link', { name: 'Schools', exact: true })).toBeVisible()
})

test("shows a school's bookings on its own detail page", async ({ page }) => {
  await signIn(page)
  await page.goto('/schools')

  const schoolRow = page.locator('table.record-table tbody tr', { hasText: BOOKINGS_SCHOOL_NAME })
  await schoolRow.click()
  await expect(page).toHaveURL(/\/schools\/\d+$/)

  const bookingsSection = page.locator('.sub-section', { hasText: 'Bookings' })
  const bookingRow = bookingsSection.locator('table.sub-table tbody tr', { hasText: BOOKING_GROUP })
  await expect(bookingRow).toBeVisible()
  await expect(bookingRow).toContainText(BOOKINGS_PROGRAM_NAME)
})

test('shows a clear "already exists" error instead of a raw validation message on a duplicate name', async ({
  page,
}) => {
  await signIn(page)

  await page.goto('/schools')
  await page.getByRole('button', { name: '+ New school' }).click()
  let dialog = page.locator('dialog.new-booking-dialog')
  await dialog.getByLabel('Name').fill(DUPLICATE_SCHOOL_NAME)
  await dialog.getByRole('button', { name: 'Create school' }).click()
  await expect(page.getByText(`A school named "${DUPLICATE_SCHOOL_NAME}" already exists.`)).toBeVisible()
  await expect(page).not.toHaveURL(/\/schools\/\d+$/)

  await page.goto('/teachers')
  await page.getByRole('button', { name: '+ New teacher' }).click()
  dialog = page.locator('dialog.new-booking-dialog')
  await dialog.getByLabel('Name').fill(DUPLICATE_TEACHER_NAME)
  await dialog.getByRole('button', { name: 'Create teacher' }).click()
  await expect(page.getByText(`A teacher named "${DUPLICATE_TEACHER_NAME}" already exists.`)).toBeVisible()

  await page.goto('/programs')
  await page.getByRole('button', { name: '+ New program' }).click()
  dialog = page.locator('dialog.new-booking-dialog')
  await dialog.getByLabel('Name').fill(DUPLICATE_PROGRAM_NAME)
  await dialog.getByRole('button', { name: 'Create program' }).click()
  await expect(page.getByText(`A program named "${DUPLICATE_PROGRAM_NAME}" already exists.`)).toBeVisible()
})

test('the search box narrows the Schools list to matching rows', async ({ page }) => {
  await signIn(page)
  await page.goto('/schools')

  // Not asserted visible up front: with pagination now in place (20 per
  // page) and enough fixture schools in this shared dev DB to span
  // multiple pages, neither row is guaranteed to land on page 1 before
  // narrowing the list is what actually puts them there.
  const matchingRow = page.locator('table.record-table tbody tr', { hasText: SEARCH_SCHOOL_NAME })
  const otherRow = page.locator('table.record-table tbody tr', { hasText: BOOKINGS_SCHOOL_NAME })

  await page.getByPlaceholder('Search schools…').fill('Zebratown')
  await expect(matchingRow).toBeVisible()
  await expect(otherRow).toBeHidden()

  await page.getByPlaceholder('Search schools…').fill('no school has this in its name at all')
  await expect(page.getByText(/No schools match/)).toBeVisible()

  // Clearing and re-searching for the other row (rather than asserting
  // it's on the unfiltered list's first page, which pagination makes
  // unpredictable) confirms the box still narrows correctly afterward.
  await page.getByPlaceholder('Search schools…').fill('')
  await page.getByPlaceholder('Search schools…').fill(BOOKINGS_SCHOOL_NAME)
  await expect(otherRow).toBeVisible()
})

test('paginates the Schools list, 20 per page', async ({ page }) => {
  await signIn(page)
  await page.goto('/schools')

  // Scoped to just the 21-school pagination fixture via search, so the
  // page-count assertions don't depend on how many other schools this
  // shared dev DB happens to have.
  await page.getByPlaceholder('Search schools…').fill(PAGINATION_SCHOOL_PREFIX)
  await expect(page.getByText('Showing 1–20 of 21')).toBeVisible()
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
  await expect(page.locator('table.record-table tbody tr')).toHaveCount(20)

  // exact: true -- a substring match on "Next" also catches Next.js's own
  // dev-mode floating "Open Next.js Dev Tools" button.
  const nextButton = page.getByRole('button', { name: 'Next', exact: true })
  const previousButton = page.getByRole('button', { name: 'Previous', exact: true })
  await expect(previousButton).toBeDisabled()

  await nextButton.click()
  await expect(page.getByText('Showing 21–21 of 21')).toBeVisible()
  await expect(page.getByText('Page 2 of 2')).toBeVisible()
  await expect(page.locator('table.record-table tbody tr')).toHaveCount(1)
  await expect(nextButton).toBeDisabled()

  await previousButton.click()
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
})

test('bulk-selects and removes multiple schools at once, with a single confirm dialog', async ({ page }) => {
  await signIn(page)
  await page.goto('/schools')

  await page.getByPlaceholder('Search schools…').fill(BULK_SCHOOL_PREFIX)
  await expect(page.locator('table.record-table tbody tr')).toHaveCount(3)

  await page.getByRole('checkbox', { name: 'Select all' }).click()
  await expect(page.getByText('3 selected')).toBeVisible()

  await page.getByRole('button', { name: 'Remove selected' }).click()
  await expect(page.getByText('Remove 3 schools? This cannot be undone.')).toBeVisible()
  await page.locator('dialog.confirm-dialog').getByRole('button', { name: 'Remove' }).click()

  await expect(page.getByText(`No schools match "${BULK_SCHOOL_PREFIX}"`)).toBeVisible()
})

test('imports schools from a CSV file, creating valid rows and reporting per-row errors', async ({ page }) => {
  await signIn(page)
  await page.goto('/schools')

  await page.getByRole('button', { name: 'Import CSV' }).click()
  const csv = [
    'name,city',
    `${IMPORT_SCHOOL_PREFIX} A,Rotterdam`,
    `${IMPORT_SCHOOL_PREFIX} B,`,
    `${DUPLICATE_SCHOOL_NAME},`,
  ].join('\n')
  await page.locator('input[type="file"]').setInputFiles({ name: 'schools.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: 'Import', exact: true }).click()

  await expect(page.getByText('2 created, 1 row(s) with errors.')).toBeVisible()
  await expect(page.getByText(`Row 4: A school named "${DUPLICATE_SCHOOL_NAME}" already exists.`)).toBeVisible()

  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByPlaceholder('Search schools…').fill(IMPORT_SCHOOL_PREFIX)
  await expect(page.locator('table.record-table tbody tr')).toHaveCount(2)
})

test('imports teachers from a CSV file, validating the kind column', async ({ page }) => {
  await signIn(page)
  await page.goto('/teachers')

  await page.getByRole('button', { name: 'Import CSV' }).click()
  const csv = [
    'displayName,kind',
    `${IMPORT_TEACHER_PREFIX} A,person`,
    `${IMPORT_TEACHER_PREFIX} B,notarealkind`,
  ].join('\n')
  await page.locator('input[type="file"]').setInputFiles({ name: 'teachers.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: 'Import', exact: true }).click()

  await expect(page.getByText('1 created, 1 row(s) with errors.')).toBeVisible()
  await expect(page.getByText('Row 3: Type must be "person" or "organisation".')).toBeVisible()

  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByPlaceholder('Search teachers…').fill(IMPORT_TEACHER_PREFIX)
  await expect(page.locator('table.record-table tbody tr')).toHaveCount(1)
})

test('imports programs from a CSV file, validating numeric columns', async ({ page }) => {
  await signIn(page)
  await page.goto('/programs')

  await page.getByRole('button', { name: 'Import CSV' }).click()
  const csv = [
    'name,defaultLessonCount',
    `${IMPORT_PROGRAM_PREFIX} A,8`,
    `${IMPORT_PROGRAM_PREFIX} B,notanumber`,
  ].join('\n')
  await page.locator('input[type="file"]').setInputFiles({ name: 'programs.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: 'Import', exact: true }).click()

  await expect(page.getByText('1 created, 1 row(s) with errors.')).toBeVisible()
  await expect(page.getByText('Row 3: "defaultLessonCount" must be a number.')).toBeVisible()

  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByPlaceholder('Search programs…').fill(IMPORT_PROGRAM_PREFIX)
  await expect(page.locator('table.record-table tbody tr')).toHaveCount(1)
})
