import { expect, test } from '@playwright/test'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

import config from '../../src/payload.config'

const TEST_USER_EMAIL = 'e2e-test@example.com'
const TEST_USER_PASSWORD = 'e2e-test-password-123'
const SCHOOL_NAME = 'E2E Test School'
const PROGRAM_NAME = 'E2E Test Program'
const TEACHER_NAME = 'E2E Test Teacher'
const GROUP_LABEL = 'e2e-group'

let payload: Payload

/**
 * Deletes everything a previous run of this suite created, keyed on the
 * fixed fixture names above. Without this, re-running the suite against the
 * same dev database accumulates a new booking/school/program every time,
 * and a locator scoped to `GROUP_LABEL` starts matching more than one row
 * -- exactly what happened the first time this was run twice.
 */
async function cleanUpPreviousRun() {
  const schools = await payload.find({ collection: 'schools', where: { name: { contains: SCHOOL_NAME } } })
  const programs = await payload.find({
    collection: 'programs',
    where: { name: { contains: PROGRAM_NAME } },
  })
  const teachers = await payload.find({
    collection: 'teachers',
    where: { displayName: { contains: TEACHER_NAME } },
  })

  if (schools.docs.length > 0) {
    const schoolIds = schools.docs.map((s) => s.id)
    const bookings = await payload.find({
      collection: 'bookings',
      where: { school: { in: schoolIds } },
      limit: 1000,
    })
    const bookingIds = bookings.docs.map((b) => b.id)
    if (bookingIds.length > 0) {
      await payload.delete({ collection: 'lessons', where: { booking: { in: bookingIds } } })
      await payload.delete({ collection: 'bookings', where: { id: { in: bookingIds } } })
    }
    await payload.delete({ collection: 'schools', where: { id: { in: schoolIds } } })
  }

  if (programs.docs.length > 0) {
    const programIds = programs.docs.map((p) => p.id)
    await payload.delete({ collection: 'lesson-templates', where: { program: { in: programIds } } })
    await payload.delete({ collection: 'programs', where: { id: { in: programIds } } })
  }

  if (teachers.docs.length > 0) {
    await payload.delete({
      collection: 'teachers',
      where: { id: { in: teachers.docs.map((t) => t.id) } },
    })
  }
}

test.beforeAll(async () => {
  payload = await getPayload({ config })
  await cleanUpPreviousRun()

  const existingUser = await payload.find({
    collection: 'users',
    where: { email: { equals: TEST_USER_EMAIL } },
  })
  if (existingUser.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD, name: 'E2E Test User', role: 'admin' },
    })
  }

  const school = await payload.create({ collection: 'schools', data: { name: SCHOOL_NAME } })
  const teacher = await payload.create({
    collection: 'teachers',
    data: { displayName: TEACHER_NAME, kind: 'person' },
  })
  const program = await payload.create({ collection: 'programs', data: { name: PROGRAM_NAME } })
  await payload.create({
    collection: 'lesson-templates',
    data: { program: program.id, sequenceNo: 1, defaultTeacher: teacher.id },
  })
  await payload.create({
    collection: 'lesson-templates',
    data: { program: program.id, sequenceNo: 2, defaultTeacher: teacher.id },
  })

  await payload.create({
    collection: 'bookings',
    data: {
      school: school.id,
      program: program.id,
      groupLabel: GROUP_LABEL,
      startDate: '2027-01-04T00:00:00.000Z',
      status: 'nieuw',
    },
  })
})

test.afterAll(async () => {
  await payload.destroy()
})

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(TEST_USER_EMAIL)
  await page.getByLabel('Password').fill(TEST_USER_PASSWORD)
  // Wait for the actual login response, not just the click -- navigating
  // away immediately raced the login POST and aborted it before the
  // Set-Cookie response was processed, the first time this test was run.
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/users/login') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /login/i }).click(),
  ])
  await page.waitForURL(/\/admin(?!\/login)/)
}

test('redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/planning')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('creates a booking from the planning grid itself, without going through /admin', async ({ page }) => {
  await signIn(page)
  await page.goto('/planning')

  const newGroupLabel = `e2e-created-${Date.now()}`

  await page.getByRole('button', { name: '+ New booking' }).click()
  const dialog = page.locator('dialog.new-booking-dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByLabel('School').selectOption({ label: SCHOOL_NAME })
  await dialog.getByLabel('Program').selectOption({ label: PROGRAM_NAME })
  await dialog.getByLabel('Group (optional)').fill(newGroupLabel)
  await dialog.locator('input[type="date"]').fill('2027-06-01')

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/planning') && res.request().method() === 'POST'),
    dialog.getByRole('button', { name: 'Create booking' }).click(),
  ])

  await expect(dialog).toBeHidden()
  const createdRow = page.locator('tr.booking-row', { hasText: newGroupLabel })
  await expect(createdRow).toBeVisible()
  // The fixture program has 2 lesson templates -- generation should have
  // fired the same as it does for a booking created via /admin.
  await expect(createdRow.locator('td').nth(6)).toHaveText('2')
})

test('signs in, expands a booking, edits a lesson, and the edit persists on reload', async ({ page }) => {
  await signIn(page)

  await page.goto('/planning')
  await expect(page).toHaveURL(/\/planning/)

  const bookingRow = page.locator('tr.booking-row', { hasText: GROUP_LABEL })
  await expect(bookingRow).toBeVisible()
  await expect(bookingRow.locator('td').nth(6)).toHaveText('2')

  await bookingRow.click()

  const lessonsPanel = page.locator('tr.lessons-row')
  await expect(lessonsPanel).toBeVisible()
  const lessonRows = lessonsPanel.locator('table.lessons-table tbody tr')
  await expect(lessonRows).toHaveCount(2)

  const firstLessonLocationInput = lessonRows.nth(0).locator('input[type="text"]').first()
  await firstLessonLocationInput.fill('e2e-gymlokaal')
  await firstLessonLocationInput.blur()

  // The Server Action's revalidatePath triggers a background refetch; wait
  // for the specific POST rather than a fixed sleep.
  await page.waitForResponse((res) => res.url().includes('/planning') && res.request().method() === 'POST')

  await page.reload()
  const bookingRowAfterReload = page.locator('tr.booking-row', { hasText: GROUP_LABEL })
  await bookingRowAfterReload.click()
  const lessonRowsAfterReload = page
    .locator('tr.lessons-row')
    .locator('table.lessons-table tbody tr')
  await expect(lessonRowsAfterReload.nth(0).locator('input[type="text"]').first()).toHaveValue(
    'e2e-gymlokaal',
  )
})
