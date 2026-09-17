import { LocalNotificationSender } from './localSender'
import { ResendNotificationSender } from './resendSender'
import type { NotificationLogger, NotificationSender } from './types'

export type { NotificationSender, StatusChangeNotification, NotificationLogger } from './types'

/**
 * Picks the notification transport for this process. Reads the environment
 * fresh on every call (deliberately not memoized) so a test can flip
 * `RESEND_API_KEY` between cases without restarting anything.
 *
 * Real Resend delivery requires both `RESEND_API_KEY` and `EMAIL_FROM` —
 * either missing falls back to {@link LocalNotificationSender}, which logs
 * instead of sending. That is the correct default for local dev and for
 * every automated test run: neither carries a real Resend key, and neither
 * should ever email anyone.
 */
export function getNotificationSender(logger?: NotificationLogger): NotificationSender {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (apiKey && from) {
    return new ResendNotificationSender(apiKey, from)
  }

  return new LocalNotificationSender(logger)
}
