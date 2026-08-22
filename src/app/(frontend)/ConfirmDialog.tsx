'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

import { useLocale } from './i18n/LocaleProvider'

export type ConfirmOptions = {
  /** Defaults to the shared "Remove" label; pass a verb-specific one for a non-removal action (e.g. "Apply status"). */
  confirmLabel?: string
  /** Defaults to true (red button) — set false for a confirmation that isn't destructive, just worth double-checking (e.g. a bulk status change). */
  destructive?: boolean
}

export type ConfirmDialogHandle = {
  /** Opens the dialog with this message; resolves true/false on the user's choice. */
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
}

/**
 * One reusable confirmation dialog per component that needs it (Planning
 * grid for bookings/lessons, School/Program detail pages for their nested
 * contacts/lesson-templates) — every destructive action in the app goes
 * through this rather than deleting on a single click. Also reused for
 * non-destructive but still worth-confirming bulk actions (e.g. applying
 * one status to many bookings at once) via the `options` param, rather
 * than building a second dialog for that.
 */
export const ConfirmDialog = forwardRef<ConfirmDialogHandle>(function ConfirmDialog(_props, ref) {
  const { t } = useLocale()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [message, setMessage] = useState('')
  const [options, setOptions] = useState<ConfirmOptions>({})
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  useImperativeHandle(ref, () => ({
    confirm(msg: string, opts?: ConfirmOptions) {
      setMessage(msg)
      setOptions(opts ?? {})
      dialogRef.current?.showModal()
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
      })
    },
  }))

  function respond(value: boolean) {
    dialogRef.current?.close()
    resolverRef.current?.(value)
    resolverRef.current = null
  }

  const destructive = options.destructive ?? true

  return (
    <dialog ref={dialogRef} className="confirm-dialog">
      <p>{message}</p>
      <div className="dialog-actions">
        <button type="button" onClick={() => respond(false)}>
          {t('confirmDialog.cancel')}
        </button>
        <button type="button" className={destructive ? 'danger' : 'primary'} onClick={() => respond(true)}>
          {options.confirmLabel ?? t('confirmDialog.remove')}
        </button>
      </div>
    </dialog>
  )
})
