'use client'

import { useRef, useState, useTransition } from 'react'

import type { Teacher } from '@/payload-types'
import { useLocale } from '../i18n/LocaleProvider'
import { createLessonTemplate } from './actions'

export function AddLessonTemplateDialog({ programId, teachers }: { programId: number; teachers: Teacher[] }) {
  const { t } = useLocale()
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
    const durationMinutes = Number(form.get('durationMinutes') || 60)
    const defaultTeacher = String(form.get('defaultTeacher') || '')

    setError(null)

    startTransition(async () => {
      const result = await createLessonTemplate(programId, {
        durationMinutes,
        defaultTeacher: defaultTeacher ? Number(defaultTeacher) : null,
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
        {t('programs.addLesson')}
      </button>
      <dialog ref={dialogRef} className="new-booking-dialog">
        <form ref={formRef} onSubmit={handleSubmit}>
          <h2>{t('programs.addLessonDialogTitle')}</h2>

          <label>
            {t('programs.durationLabel')}
            <input type="number" name="durationMinutes" min={1} defaultValue={60} />
          </label>
          <label>
            {t('programs.defaultTeacherLabel')}
            <select name="defaultTeacher" defaultValue="">
              <option value="">{t('common.none')}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.displayName}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="error-banner">{error}</p>}

          <div className="dialog-actions">
            <button type="button" onClick={close} disabled={isPending}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="primary" disabled={isPending}>
              {isPending ? t('programs.addingLesson') : t('programs.addLessonButton')}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
