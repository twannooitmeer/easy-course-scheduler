'use client'

import { useState, useTransition } from 'react'

import type { Teacher } from '@/payload-types'
import { createTeacher, updateTeacher, type TeacherInput } from './actions'

function emptyForm(): TeacherInput {
  return { displayName: '', kind: 'person', email: '', phone: '', active: true }
}

function formFromTeacher(teacher: Teacher | null): TeacherInput {
  if (!teacher) return emptyForm()
  return {
    displayName: teacher.displayName,
    kind: teacher.kind,
    email: teacher.email ?? '',
    phone: teacher.phone ?? '',
    active: teacher.active ?? true,
  }
}

function TeacherForm({
  editingTeacher,
  onDone,
}: {
  editingTeacher: Teacher | null
  onDone: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<TeacherInput>(() => formFromTeacher(editingTeacher))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.displayName.trim()) {
      setError('Name is required.')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = editingTeacher
        ? await updateTeacher(editingTeacher.id, form)
        : await createTeacher(form)

      if (result.success) {
        onDone()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{editingTeacher ? 'Edit teacher' : 'New teacher'}</h2>

      <label>
        Name
        <input
          type="text"
          required
          value={form.displayName}
          onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
        />
      </label>

      <label>
        Type
        <select
          value={form.kind}
          onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as Teacher['kind'] }))}
        >
          <option value="person">Person</option>
          <option value="organisation">Organisation</option>
        </select>
      </label>

      <label>
        Email
        <input
          type="email"
          value={form.email ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </label>

      <label>
        Phone
        <input
          type="text"
          value={form.phone ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.active ?? true}
          onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
        />
        Active
      </label>

      {error && <p className="error-banner">{error}</p>}

      <div className="dialog-actions">
        <button type="button" onClick={onDone} disabled={isPending}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={isPending}>
          {isPending ? 'Saving…' : editingTeacher ? 'Save' : 'Create teacher'}
        </button>
      </div>
    </form>
  )
}

export function TeacherFormDialog({
  dialogRef,
  editingTeacher,
  onClose,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>
  editingTeacher: Teacher | null
  onClose: () => void
}) {
  function handleDone() {
    dialogRef.current?.close()
    onClose()
  }

  return (
    <dialog ref={dialogRef} className="new-booking-dialog">
      <TeacherForm key={editingTeacher?.id ?? 'new'} editingTeacher={editingTeacher} onDone={handleDone} />
    </dialog>
  )
}
