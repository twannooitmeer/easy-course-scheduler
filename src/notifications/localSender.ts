import type { NotificationLogger, NotificationSender, StatusChangeNotification } from './types'

/**
 * The default sender for local development and every automated test run:
 * logs what would have been sent instead of making a network call. Selected
 * by `getNotificationSender()` (index.ts) whenever `RESEND_API_KEY` /
 * `EMAIL_FROM` aren't both configured — which is the case for a fresh clone,
 * CI, and this repo's own test suite, none of which carry a real Resend key.
 */
export class LocalNotificationSender implements NotificationSender {
  constructor(private readonly logger: NotificationLogger = console) {}

  async send(notification: StatusChangeNotification): Promise<void> {
    this.logger.info(
      `[notifications] no RESEND_API_KEY/EMAIL_FROM configured — logging instead of sending. ` +
        `to=${notification.to.join(', ') || '(no recipients)'} subject="${notification.subject}"`,
    )
  }
}
