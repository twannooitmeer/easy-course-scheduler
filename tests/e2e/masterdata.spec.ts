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

  const matchingRow = page.locator('table.record-table tbody tr', { hasText: SEARCH_SCHOOL_NAME })
  const otherRow = page.locator('table.record-table tbody tr', { hasText: BOOKINGS_SCHOOL_NAME })
  await expect(matchingRow).toBeVisible()
  await expect(otherRow).toBeVisible()

  await page.getByPlaceholder('Search schools…').fill('Zebratown')
  await expect(matchingRow).toBeVisible()
  await expect(otherRow).toBeHidden()

  await page.getByPlaceholder('Search schools…').fill('no school has this in its name at all')
  await expect(page.getByText(/No schools match/)).toBeVisible()

  await page.getByPlaceholder('Search schools…').fill('')
  await expect(otherRow).toBeVisible()
})
