'use client'

import { useRef, useState, useTransition } from 'react'

import { createContact } from './actions'

export function AddContactDialog({ schoolId }: { schoolId: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function open() {
    setError(null)
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
    formRef.current?.reset()
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const fullName = String(form.get('fullName') || '').trim()

    if (!fullName) {
      setError('Full name is required.')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createContact(schoolId, {
        fullName,
        firstName: String(form.get('firstName') || '') || undefined,
        lastName: String(form.get('lastName') || '') || undefined,
        email: String(form.get('email') || '') || undefined,
        phone: String(form.get('phone') || '') || undefined,
      })
      if (result.success) {
        close()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button type="button" className="icon-button" onClick={open}>
        + Add contact
      </button>
      <dialog ref={dialogRef} className="new-booking-dialog">
        <form ref={formRef} onSubmit={handleSubmit}>
          <h2>Add contact</h2>

          <label>
            Full name
            <input type="text" name="fullName" required />
          </label>
          <label>
            First name
            <input type="text" name="firstName" />
          </label>
          <label>
            Last name
            <input type="text" name="lastName" />
          </label>
          <label>
            Email
            <input type="email" name="email" />
          </label>
          <label>
            Phone
            <input type="text" name="phone" />
          </label>

          {error && <p className="error-banner">{error}</p>}

          <div className="dialog-actions">
            <button type="button" onClick={close} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={isPending}>
              {isPending ? 'Adding…' : 'Add contact'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
