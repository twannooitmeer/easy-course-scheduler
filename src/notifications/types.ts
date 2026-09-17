/**
 * One outgoing notification email. `to` is a plain list rather than a
 * single address since a Booking's recipients are every Contact at its
 * School, and a Lesson's are every assigned Teacher.
 */
export type StatusChangeNotification = {
  to: string[]
  subject: string
  text: string
}

/**
 * Transport-agnostic sender interface. `getNotificationSender()` (index.ts)
 * picks the real Resend implementation when a deployment has configured it,
 * or the local/no-op implementation otherwise — the collection hooks that
 * trigger a notification (see statusChangeHooks.ts) only ever depend on
 * this interface, never on `resendSender.ts` directly, so dev and every
 * test run stay network-free by default.
 */
export interface NotificationSender {
  send(notification: StatusChangeNotification): Promise<void>
}

/** Minimal logger shape both senders accept — matches Payload's own logger and `console`. */
export type NotificationLogger = {
  info: (msg: string) => void
  error?: (msg: string) => void
}
