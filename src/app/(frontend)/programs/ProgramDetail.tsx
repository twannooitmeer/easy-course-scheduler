'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'

import type { LessonTemplate, Program, Teacher } from '@/payload-types'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { AddLessonTemplateDialog } from './AddLessonTemplateDialog'
import { deleteLessonTemplate, updateProgram, type ProgramInput } from './actions'

function teacherName(teacher: LessonTemplate['defaultTeacher']): string {
  if (!teacher) return '—'
  return typeof teacher === 'object' ? teacher.displayName : `#${teacher}`
}

export function ProgramDetail({
  program,
  lessonTemplates,
  teachers,
}: {
  program: Program
  lessonTemplates: LessonTemplate[]
  teachers: Teacher[]
}) {
  const [form, setForm] = useState<ProgramInput>({
    name: program.name,
    description: program.description ?? '',
    soort: program.soort,
    defaultLessonCount: program.defaultLessonCount ?? undefined,
    defaultLessonDurationMinutes: program.defaultLessonDurationMinutes ?? undefined,
    price: program.price ?? undefined,
    active: program.active ?? true,
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const confirmRef = useRef<ConfirmDialogHandle>(null)

  function save(patch: ProgramInput) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateProgram(program.id, patch)
      if (result.success) {
        setSaved(true)
      } else {
        setError(result.error)
      }
    })
  }

  function textField<K extends keyof ProgramInput>(key: K) {
    return {
      value: (form[key] as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
      onBlur: () => save({ [key]: form[key] }),
    }
  }

  function numberField<K extends keyof ProgramInput>(key: K) {
    return {
      value: (form[key] as number | undefined) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value === '' ? undefined : Number(e.target.value) })),
      onBlur: () => save({ [key]: form[key] }),
    }
  }

  function handleSoortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = (e.target.value || undefined) as ProgramInput['soort']
    setForm((f) => ({ ...f, soort: value }))
    save({ soort: value })
  }

  function handleActiveChange(e: React.ChangeEvent<HTMLInputElement>) {
    const active = e.target.checked
    setForm((f) => ({ ...f, active }))
    save({ active })
  }

  async function handleRemoveLessonTemplate(template: LessonTemplate) {
    const ok = await confirmRef.current?.confirm(
      `Remove lesson ${template.sequenceNo} from this program? This cannot be undone.`,
    )
    if (!ok) return
    const result = await deleteLessonTemplate(template.id, program.id)
    if (!result.success) setError(result.error)
  }

  return (
    <div className="page">
      <Link href="/programs" className="back-link">
        ← Back to programs
      </Link>
      <div className="page-header">
        <div>
          <h1>{program.name}</h1>
          <p className="subtitle">
            {isPending && <span className="saving-dot" title="Saving…" />}
            {saved && !isPending && <span className="saved-hint"> Saved</span>}
          </p>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <form className="record-form" onSubmit={(e) => e.preventDefault()}>
        <label className="field-full">
          Name
          <input type="text" {...textField('name')} required />
        </label>
        <label>
          Soort
          <select value={form.soort ?? ''} onChange={handleSoortChange}>
            <option value="">—</option>
            <option value="regulier">Regulier</option>
            <option value="maatwerk">Maatwerk</option>
            <option value="cmk">CMK</option>
            <option value="kbw">KBW</option>
          </select>
        </label>
        <label>
          Price (€)
          <input type="number" min={0} {...numberField('price')} />
        </label>
        <label>
          Default lesson count
          <input type="number" min={1} {...numberField('defaultLessonCount')} />
        </label>
        <label>
          Default lesson duration (minutes)
          <input type="number" min={1} {...numberField('defaultLessonDurationMinutes')} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.active ?? true} onChange={handleActiveChange} />
          Active
        </label>
        <label className="field-full">
          Description
          <textarea {...textField('description')} />
        </label>
      </form>

      <div className="sub-section">
        <div className="sub-section-header">
          <h2>Lessons</h2>
          <AddLessonTemplateDialog programId={program.id} teachers={teachers} />
        </div>

        {lessonTemplates.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>No lessons yet.</p>
        ) : (
          <table className="sub-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Duration</th>
                <th>Default teacher</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lessonTemplates.map((template) => (
                <tr key={template.id}>
                  <td>{template.sequenceNo}</td>
                  <td>{template.durationMinutes ?? '—'} min</td>
                  <td>{teacherName(template.defaultTeacher)}</td>
                  <td>
                    <button type="button" className="icon-button" onClick={() => handleRemoveLessonTemplate(template)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog ref={confirmRef} />
    </div>
  )
}
