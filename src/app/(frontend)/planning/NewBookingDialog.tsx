'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'

import { useLocale } from '../i18n/LocaleProvider'
import { createBooking } from './actions'
import type { ProgramOption, SchoolOption } from './types'

export function NewBookingDialog({
  schoolOptions,
  programOptions,
}: {
  schoolOptions: SchoolOption[]
  programOptions: ProgramOption[]
}) {
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
    setError(null)

    const form = new FormData(e.currentTarget)
    const school = Number(form.get('school'))
    const program = Number(form.get('program'))
    const groupLabel = String(form.get('groupLabel') || '')
    const startDate = String(form.get('startDate') || '')

    if (!school || !program || !startDate) {
      setError(t('planning.validationRequired'))
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
        {t('planning.newBooking')}
      </button>
      <dialog ref={dialogRef} className="new-booking-dialog">
        <form ref={formRef} onSubmit={handleSubmit}>
          <h2>{t('planning.newBookingDialogTitle')}</h2>
          <p className="dialog-subtitle">{t('planning.newBookingDialogSubtitle')}</p>

          {schoolOptions.length === 0 || programOptions.length === 0 ? (
            <p className="dialog-warning">
              {t('planning.newBookingWarningNoData')}{' '}
              <Link href="/schools">{t('planning.schoolsLink')}</Link> · <Link href="/programs">{t('planning.programsLink')}</Link>
            </p>
          ) : (
            <>
              <label>
                {t('planning.columnSchool')}
                <select name="school" required defaultValue="">
                  <option value="" disabled>
                    {t('planning.selectSchoolPlaceholder')}
                  </option>
                  {schoolOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t('planning.columnProgram')}
                <select name="program" required defaultValue="">
                  <option value="" disabled>
                    {t('planning.selectProgramPlaceholder')}
                  </option>
                  {programOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t('planning.groupOptional')}
                <input type="text" name="groupLabel" placeholder={t('planning.groupPlaceholder')} />
              </label>

              <label>
                {t('planning.startDate')}
                <input type="date" name="startDate" required />
              </label>
            </>
          )}

          {error && <p className="error-banner">{error}</p>}

          <div className="dialog-actions">
            <button type="button" onClick={close} disabled={isPending}>
              {t('common.cancel')}
            </button>
            {schoolOptions.length > 0 && programOptions.length > 0 && (
              <button type="submit" className="primary" disabled={isPending}>
                {isPending ? t('planning.creatingBooking') : t('planning.createBooking')}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  )
}
