'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'

import type { Contact, School } from '@/payload-types'
import { BookingsSubSection, type BookingSummary } from '../BookingsSubSection'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { useLocale } from '../i18n/LocaleProvider'
import { AddContactDialog } from './AddContactDialog'
import { deleteContact, updateSchool, type SchoolInput } from './actions'

export function SchoolDetail({
  school,
  contacts,
  bookings,
}: {
  school: School
  contacts: Contact[]
  bookings: BookingSummary[]
}) {
  const { t } = useLocale()
  const [form, setForm] = useState<SchoolInput>({
    name: school.name,
    street: school.street ?? '',
    houseNumber: school.houseNumber ?? '',
    addition: school.addition ?? '',
    postalCode: school.postalCode ?? '',
    city: school.city ?? '',
    country: school.country ?? '',
    phone: school.phone ?? '',
    defaultLocationNote: school.defaultLocationNote ?? '',
    notes: school.notes ?? '',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const confirmRef = useRef<ConfirmDialogHandle>(null)

  function save(patch: SchoolInput) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateSchool(school.id, patch)
      if (result.success) {
        setSaved(true)
      } else {
        setError(result.error)
      }
    })
  }

  function field<K extends keyof SchoolInput>(key: K) {
    return {
      value: (form[key] as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
      onBlur: () => save({ [key]: form[key] }),
    }
  }

  async function handleRemoveContact(contact: Contact) {
    const ok = await confirmRef.current?.confirm(t('schools.confirmRemoveContact', { name: contact.fullName }))
    if (!ok) return
    const result = await deleteContact(contact.id, school.id)
    if (!result.success) setError(result.error)
  }

  return (
    <div className="page">
      <Link href="/schools" className="back-link">
        {t('schools.backLink')}
      </Link>
      <div className="page-header">
        <div>
          <h1>{school.name}</h1>
          <p className="subtitle">
            {isPending && <span className="saving-dot" title={t('common.saving')} />}
            {saved && !isPending && <span className="saved-hint"> {t('common.saved')}</span>}
          </p>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <form
        className="record-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="field-full">
          {t('schools.fieldName')}
          <input type="text" {...field('name')} required />
        </label>
        <label>
          {t('schools.fieldStreet')}
          <input type="text" {...field('street')} />
        </label>
        <label>
          {t('schools.fieldHouseNumber')}
          <input type="text" {...field('houseNumber')} />
        </label>
        <label>
          {t('schools.fieldAddition')}
          <input type="text" {...field('addition')} />
        </label>
        <label>
          {t('schools.fieldPostalCode')}
          <input type="text" {...field('postalCode')} />
        </label>
        <label>
          {t('schools.fieldCity')}
          <input type="text" {...field('city')} />
        </label>
        <label>
          {t('schools.fieldCountry')}
          <input type="text" {...field('country')} />
        </label>
        <label>
          {t('schools.fieldPhone')}
          <input type="text" {...field('phone')} />
        </label>
        <label className="field-full">
          {t('schools.fieldDefaultLocation')}
          <input type="text" {...field('defaultLocationNote')} placeholder={t('schools.fieldDefaultLocationPlaceholder')} />
        </label>
        <label className="field-full">
          {t('schools.fieldNotes')}
          <textarea {...field('notes')} />
        </label>
      </form>

      <div className="sub-section">
        <div className="sub-section-header">
          <h2>{t('schools.contactsHeading')}</h2>
          <AddContactDialog schoolId={school.id} />
        </div>

        {contacts.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{t('schools.noContactsYet')}</p>
        ) : (
          <table className="sub-table">
            <thead>
              <tr>
                <th>{t('schools.contactColumnName')}</th>
                <th>{t('schools.contactColumnEmail')}</th>
                <th>{t('schools.contactColumnPhone')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.fullName}</td>
                  <td>{contact.email || t('common.none')}</td>
                  <td>{contact.phone || t('common.none')}</td>
                  <td>
                    <button
                      type="button"
                      className="delete-button"
                      aria-label={t('schools.removeContact')}
                      title={t('schools.removeContact')}
                      onClick={() => handleRemoveContact(contact)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BookingsSubSection bookings={bookings} hideSchool />

      <ConfirmDialog ref={confirmRef} />
    </div>
  )
}
