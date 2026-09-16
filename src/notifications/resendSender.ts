import type { NotificationSender, StatusChangeNotification } from './types'

const RESEND_API_URL = 'https://api.resend.com/emails'

/**
 * Real transactional-email transport via Resend's HTTP API. Talks to it
 * with a plain `fetch` call rather than the `resend` SDK — one JSON POST is
 * all this needs, and it avoids adding a dependency purely to construct a
 * request every deployment can also make by hand if it ever needs to.
 *
 * Only constructed by `getNotificationSender()` (index.ts) when both
 * `RESEND_API_KEY` and `EMAIL_FROM` are set, so a deployment with no key
 * configured never reaches this class at all.
 */
export class ResendNotificationSender implements NotificationSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(notification: StatusChangeNotification): Promise<void> {
    if (notification.to.length === 0) return

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: notification.to,
        subject: notification.subject,
        text: notification.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Resend API error ${response.status}: ${body}`)
    }
  }
}
