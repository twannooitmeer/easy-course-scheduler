'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

import { useLocale } from './i18n/LocaleProvider'

export type ConfirmDialogHandle = {
  /** Opens the dialog with this message; resolves true/false on the user's choice. */
  confirm: (message: string) => Promise<boolean>
}

/**
 * One reusable confirmation dialog per component that needs it (Planning
 * grid for bookings/lessons, School/Program detail pages for their nested
 * contacts/lesson-templates) — every destructive action in the app goes
 * through this rather than deleting on a single click.
 */
export const ConfirmDialog = forwardRef<ConfirmDialogHandle>(function ConfirmDialog(_props, ref) {
  const { t } = useLocale()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [message, setMessage] = useState('')
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  useImperativeHandle(ref, () => ({
    confirm(msg: string) {
      setMessage(msg)
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

  return (
    <dialog ref={dialogRef} className="confirm-dialog">
      <p>{message}</p>
      <div className="dialog-actions">
        <button type="button" onClick={() => respond(false)}>
          {t('confirmDialog.cancel')}
        </button>
        <button type="button" className="danger" onClick={() => respond(true)}>
          {t('confirmDialog.remove')}
        </button>
      </div>
    </dialog>
  )
})
