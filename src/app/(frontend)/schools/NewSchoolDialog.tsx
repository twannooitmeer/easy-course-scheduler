'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import { useLocale } from '../i18n/LocaleProvider'
import { createSchool } from './actions'

export function NewSchoolDialog() {
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
    const name = String(form.get('name') || '').trim()
    const city = String(form.get('city') || '').trim()

    if (!name) {
      setError(t('schools.validationNameRequired'))
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createSchool({ name, city: city || undefined })
      if (result.success) {
        close()
        router.push(`/schools/${result.id}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button type="button" className="admin-link" onClick={open}>
        {t('schools.newSchool')}
      </button>
      <dialog ref={dialogRef} className="new-booking-dialog">
        <form ref={formRef} onSubmit={handleSubmit}>
          <h2>{t('schools.newSchoolDialogTitle')}</h2>
          <p className="dialog-subtitle">{t('schools.newSchoolDialogSubtitle')}</p>

          <label>
            {t('schools.fieldName')}
            <input type="text" name="name" required />
          </label>
          <label>
            {t('schools.cityOptional')}
            <input type="text" name="city" />
          </label>

          {error && <p className="error-banner">{error}</p>}

          <div className="dialog-actions">
            <button type="button" onClick={close} disabled={isPending}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="primary" disabled={isPending}>
              {isPending ? t('schools.creatingSchool') : t('schools.createSchool')}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
