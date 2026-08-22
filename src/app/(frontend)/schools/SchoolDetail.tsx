'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'

import type { Contact, School } from '@/payload-types'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { AddContactDialog } from './AddContactDialog'
import { deleteContact, updateSchool, type SchoolInput } from './actions'

export function SchoolDetail({ school, contacts }: { school: School; contacts: Contact[] }) {
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
    const ok = await confirmRef.current?.confirm(`Remove contact "${contact.fullName}"? This cannot be undone.`)
    if (!ok) return
    const result = await deleteContact(contact.id, school.id)
    if (!result.success) setError(result.error)
  }

  return (
    <div className="page">
      <Link href="/schools" className="back-link">
        ← Back to schools
      </Link>
      <div className="page-header">
        <div>
          <h1>{school.name}</h1>
          <p className="subtitle">
            {isPending && <span className="saving-dot" title="Saving…" />}
            {saved && !isPending && <span className="saved-hint"> Saved</span>}
          </p>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <form
        className="record-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="field-full">
          Name
          <input type="text" {...field('name')} required />
        </label>
        <label>
          Street
          <input type="text" {...field('street')} />
        </label>
        <label>
          House number
          <input type="text" {...field('houseNumber')} />
        </label>
        <label>
          Addition
          <input type="text" {...field('addition')} />
        </label>
        <label>
          Postal code
          <input type="text" {...field('postalCode')} />
        </label>
        <label>
          City
          <input type="text" {...field('city')} />
        </label>
        <label>
          Country
          <input type="text" {...field('country')} />
        </label>
        <label>
          Phone
          <input type="text" {...field('phone')} />
        </label>
        <label className="field-full">
          Default location
          <input type="text" {...field('defaultLocationNote')} placeholder='e.g. "in de klas", "gymlokaal"' />
        </label>
        <label className="field-full">
          Notes
          <textarea {...field('notes')} />
        </label>
      </form>

      <div className="sub-section">
        <div className="sub-section-header">
          <h2>Contacts</h2>
          <AddContactDialog schoolId={school.id} />
        </div>

        {contacts.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>No contacts yet.</p>
        ) : (
          <table className="sub-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.fullName}</td>
                  <td>{contact.email || '—'}</td>
                  <td>{contact.phone || '—'}</td>
                  <td>
                    <button type="button" className="icon-button" onClick={() => handleRemoveContact(contact)}>
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
