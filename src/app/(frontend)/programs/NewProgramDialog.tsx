'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import type { Program } from '@/payload-types'
import { createProgram } from './actions'

export function NewProgramDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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
    const name = String(form.get('name') || '').trim()
    const soort = String(form.get('soort') || '')

    if (!name) {
      setError('Name is required.')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createProgram({ name, soort: soort ? (soort as Program['soort']) : undefined })
      if (result.success) {
        close()
        router.push(`/programs/${result.id}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button type="button" className="admin-link" onClick={open}>
        + New program
      </button>
      <dialog ref={dialogRef} className="new-booking-dialog">
        <form ref={formRef} onSubmit={handleSubmit}>
          <h2>New program</h2>
          <p className="dialog-subtitle">Add the rest of the details afterward on the program&apos;s own page.</p>

          <label>
            Name
            <input type="text" name="name" required />
          </label>
          <label>
            Soort (optional)
            <select name="soort" defaultValue="">
              <option value="">—</option>
              <option value="regulier">Regulier</option>
              <option value="maatwerk">Maatwerk</option>
              <option value="cmk">CMK</option>
              <option value="kbw">KBW</option>
            </select>
          </label>

          {error && <p className="error-banner">{error}</p>}

          <div className="dialog-actions">
            <button type="button" onClick={close} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create program'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
