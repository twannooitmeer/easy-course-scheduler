'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import type { Teacher } from '@/payload-types'
import { BookingsSubSection, type BookingSummary } from '../BookingsSubSection'
import { useLocale } from '../i18n/LocaleProvider'
import { updateTeacher, type TeacherInput } from './actions'

export function TeacherDetail({ teacher, bookings }: { teacher: Teacher; bookings: BookingSummary[] }) {
  const { t } = useLocale()
  const [form, setForm] = useState<TeacherInput>({
    displayName: teacher.displayName,
    kind: teacher.kind,
    email: teacher.email ?? '',
    phone: teacher.phone ?? '',
    active: teacher.active ?? true,
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(patch: Partial<TeacherInput>) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateTeacher(teacher.id, patch)
      if (result.success) {
        setSaved(true)
      } else {
        setError(result.error)
      }
    })
  }

  function textField<K extends keyof TeacherInput>(key: K) {
    return {
      value: (form[key] as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
      onBlur: () => save({ [key]: form[key] }),
    }
  }

  function handleKindChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const kind = e.target.value as Teacher['kind']
    setForm((f) => ({ ...f, kind }))
    save({ kind })
  }

  function handleActiveChange(e: React.ChangeEvent<HTMLInputElement>) {
    const active = e.target.checked
    setForm((f) => ({ ...f, active }))
    save({ active })
  }

  return (
    <div className="page">
      <Link href="/teachers" className="back-link">
        {t('teachers.backLink')}
      </Link>
      <div className="page-header">
        <div>
          <h1>{teacher.displayName}</h1>
          <p className="subtitle">
            {isPending && <span className="saving-dot" title={t('common.saving')} />}
            {saved && !isPending && <span className="saved-hint"> {t('common.saved')}</span>}
          </p>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <form className="record-form" onSubmit={(e) => e.preventDefault()}>
        <label className="field-full">
          {t('teachers.fieldName')}
          <input type="text" {...textField('displayName')} required />
        </label>
        <label>
          {t('teachers.fieldType')}
          <select value={form.kind} onChange={handleKindChange}>
            <option value="person">{t('teachers.typePerson')}</option>
            <option value="organisation">{t('teachers.typeOrganisation')}</option>
          </select>
        </label>
        <label>
          {t('teachers.fieldEmail')}
          <input type="email" {...textField('email')} />
        </label>
        <label>
          {t('teachers.fieldPhone')}
          <input type="text" {...textField('phone')} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.active ?? true} onChange={handleActiveChange} />
          {t('teachers.fieldActive')}
        </label>
      </form>

      <BookingsSubSection bookings={bookings} />
    </div>
  )
}
