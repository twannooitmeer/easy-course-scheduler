'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import type { Teacher } from '@/payload-types'
import { useLocale } from '../i18n/LocaleProvider'
import { createTeacher } from './actions'

export function NewTeacherDialog() {
  const { t } = useLocale()
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
    const displayName = String(form.get('displayName') || '').trim()
    const kind = String(form.get('kind') || 'person') as Teacher['kind']

    if (!displayName) {
      setError(t('teachers.validationNameRequired'))
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createTeacher({ displayName, kind })
      if (result.success) {
        close()
        router.push(`/teachers/${result.id}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button type="button" className="admin-link" onClick={open}>
        {t('teachers.newTeacher')}
      </button>
      <dialog ref={dialogRef} className="new-booking-dialog">
        <form ref={formRef} onSubmit={handleSubmit}>
          <h2>{t('teachers.newTeacherDialogTitle')}</h2>
          <p className="dialog-subtitle">{t('teachers.newTeacherDialogSubtitle')}</p>

          <label>
            {t('teachers.fieldName')}
            <input type="text" name="displayName" required />
          </label>
          <label>
            {t('teachers.fieldType')}
            <select name="kind" defaultValue="person">
              <option value="person">{t('teachers.typePerson')}</option>
              <option value="organisation">{t('teachers.typeOrganisation')}</option>
            </select>
          </label>

          {error && <p className="error-banner">{error}</p>}

          <div className="dialog-actions">
            <button type="button" onClick={close} disabled={isPending}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="primary" disabled={isPending}>
              {isPending ? t('teachers.creatingTeacher') : t('teachers.createTeacher')}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
