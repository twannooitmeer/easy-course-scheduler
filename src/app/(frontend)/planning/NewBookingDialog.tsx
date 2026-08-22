'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'

import { createBooking } from './actions'
import type { ProgramOption, SchoolOption } from './types'

export function NewBookingDialog({
  schoolOptions,
  programOptions,
}: {
  schoolOptions: SchoolOption[]
  programOptions: ProgramOption[]
}) {
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
    setError(null)

    const form = new FormData(e.currentTarget)
    const school = Number(form.get('school'))
    const program = Number(form.get('program'))
    const groupLabel = String(form.get('groupLabel') || '')
    const startDate = String(form.get('startDate') || '')

    if (!school || !program || !startDate) {
      setError('School, program, and start date are all required.')
      return
    }

    startTransition(async () => {
      const result = await createBooking({
        school,
        program,
        groupLabel,
        startDate: `${startDate}T00:00:00.000Z`,
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
      <button type="button" className="admin-link" onClick={open}>
        + New booking
      </button>
      <dialog ref={dialogRef} className="new-booking-dialog">
        <form ref={formRef} onSubmit={handleSubmit}>
          <h2>New booking</h2>
          <p className="dialog-subtitle">
            Book a school onto a program — its lessons generate automatically from the program&apos;s
            lesson templates.
          </p>

          {schoolOptions.length === 0 || programOptions.length === 0 ? (
            <p className="dialog-warning">
              You need at least one school and one program before you can create a booking. Set those up
              in <Link href="/admin">the admin panel</Link> first — that part is genuinely one-time setup, not
              daily work.
            </p>
          ) : (
            <>
              <label>
                School
                <select name="school" required defaultValue="">
                  <option value="" disabled>
                    Select a school…
                  </option>
                  {schoolOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Program
                <select name="program" required defaultValue="">
                  <option value="" disabled>
                    Select a program…
                  </option>
                  {programOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Group (optional)
                <input type="text" name="groupLabel" placeholder="e.g. 3a" />
              </label>

              <label>
                Start date
                <input type="date" name="startDate" required />
              </label>
            </>
          )}

          {error && <p className="error-banner">{error}</p>}

          <div className="dialog-actions">
            <button type="button" onClick={close} disabled={isPending}>
              Cancel
            </button>
            {schoolOptions.length > 0 && programOptions.length > 0 && (
              <button type="submit" className="primary" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create booking'}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  )
}
