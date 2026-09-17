import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getNotificationSender } from '../../src/notifications'
import { LocalNotificationSender } from '../../src/notifications/localSender'
import { ResendNotificationSender } from '../../src/notifications/resendSender'
import { buildBookingStatusChangeEmail, buildLessonStatusChangeEmail } from '../../src/notifications/templates'

/**
 * Pure, DB-free coverage for the notification transport and template
 * layer. The hook wiring itself (that a real status change on a Booking or
 * Lesson actually reaches this code, and does so silently without a Resend
 * key configured) is covered separately in notificationHooks.int.spec.ts,
 * which needs the real Payload/Postgres local API.
 */
describe('getNotificationSender', () => {
  const originalApiKey = process.env.RESEND_API_KEY
  const originalFrom = process.env.EMAIL_FROM

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = originalApiKey
    if (originalFrom === undefined) delete process.env.EMAIL_FROM
    else process.env.EMAIL_FROM = originalFrom
  })

  it('falls back to the local (no-op) sender when RESEND_API_KEY is not set', () => {
    delete process.env.RESEND_API_KEY
    process.env.EMAIL_FROM = 'Scheduler <hello@example.com>'

    expect(getNotificationSender()).toBeInstanceOf(LocalNotificationSender)
  })

  it('falls back to the local (no-op) sender when EMAIL_FROM is not set', () => {
    process.env.RESEND_API_KEY = 're_test_key'
    delete process.env.EMAIL_FROM

    expect(getNotificationSender()).toBeInstanceOf(LocalNotificationSender)
  })

  it('selects the real Resend sender only once both vars are configured', () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.EMAIL_FROM = 'Scheduler <hello@example.com>'

    expect(getNotificationSender()).toBeInstanceOf(ResendNotificationSender)
  })
})

describe('LocalNotificationSender', () => {
  it('logs instead of making any network call, and never throws', async () => {
    const info = vi.fn()
    const sender = new LocalNotificationSender({ info })

    await expect(
      sender.send({ to: ['test@example.com'], subject: 'Test subject', text: 'Test body' }),
    ).resolves.toBeUndefined()

    expect(info).toHaveBeenCalledTimes(1)
    expect(info.mock.calls[0][0]).toContain('Test subject')
    expect(info.mock.calls[0][0]).toContain('test@example.com')
  })
})

describe('ResendNotificationSender', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('POSTs to the Resend API with the configured from-address and auth header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' })
    global.fetch = fetchMock as unknown as typeof fetch

    const sender = new ResendNotificationSender('re_test_key', 'Scheduler <hello@example.com>')
    await sender.send({ to: ['a@example.com', 'b@example.com'], subject: 'Subj', text: 'Body' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer re_test_key')
    const body = JSON.parse(init.body)
    expect(body.from).toBe('Scheduler <hello@example.com>')
    expect(body.to).toEqual(['a@example.com', 'b@example.com'])
    expect(body.subject).toBe('Subj')
  })

  it('throws when Resend responds with a non-ok status, so the caller can log the failure', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 422, text: async () => 'invalid from address' }) as unknown as typeof fetch

    const sender = new ResendNotificationSender('re_test_key', 'bad-from')
    await expect(sender.send({ to: ['a@example.com'], subject: 'x', text: 'y' })).rejects.toThrow(/422/)
  })

  it('is a no-op when there are no recipients (does not call the API)', async () => {
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    const sender = new ResendNotificationSender('re_test_key', 'Scheduler <hello@example.com>')
    await sender.send({ to: [], subject: 'x', text: 'y' })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('email templates', () => {
  it('builds an English booking status-change email with the status label substituted', () => {
    const email = buildBookingStatusChangeEmail({
      locale: 'en',
      schoolName: 'Example School',
      programName: 'Example Program',
      groupLabel: '3a',
      status: 'akkoord_docent',
    })

    expect(email.subject).toBe('Example School — Example Program: status changed to Akkoord docent')
    expect(email.text).toContain('Example School')
    expect(email.text).toContain('3a')
    expect(email.text).toContain('Akkoord docent')
  })

  it('builds a Dutch booking status-change email', () => {
    const email = buildBookingStatusChangeEmail({
      locale: 'nl',
      schoolName: 'Voorbeeldschool',
      programName: 'Voorbeeldprogramma',
      groupLabel: null,
      status: 'nieuw',
    })

    expect(email.subject).toContain('status gewijzigd naar Nieuw')
    expect(email.text).toContain('Voorbeeldschool')
  })

  it('builds a lesson status-change email with the sequence number and formatted date', () => {
    const email = buildLessonStatusChangeEmail({
      locale: 'en',
      schoolName: 'Example School',
      programName: 'Example Program',
      sequenceNo: 3,
      lessonDate: '2026-09-01T00:00:00.000Z',
      status: 'akkoord_school',
    })

    expect(email.subject).toContain('lesson 3')
    expect(email.subject).toContain('Akkoord school')
    expect(email.text).toContain('Example School')
  })

  it('defaults to DEFAULT_LOCALE when no locale is given', () => {
    const email = buildBookingStatusChangeEmail({
      schoolName: 'Example School',
      programName: 'Example Program',
      status: 'nieuw',
    })

    // DEFAULT_LOCALE is 'en' -- see src/app/(frontend)/i18n/locale.ts
    expect(email.subject).toContain('status changed to')
  })
})
