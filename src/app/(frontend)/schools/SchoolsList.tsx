'use client'

import { useRouter } from 'next/navigation'

import type { School } from '@/payload-types'
import { NewSchoolDialog } from './NewSchoolDialog'

export function SchoolsList({
  schools,
}: {
  schools: (School & { contactCount: number })[]
}) {
  const router = useRouter()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Schools</h1>
          <p className="subtitle">Schools booked onto programs, with their contacts.</p>
        </div>
        <NewSchoolDialog />
      </div>

      {schools.length === 0 ? (
        <div className="empty-state">
          <p>No schools yet.</p>
          <p>Use the + New school button above to add one.</p>
        </div>
      ) : (
        <div className="grid-card">
          <div className="grid-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Phone</th>
                  <th>Contacts</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} onClick={() => router.push(`/schools/${school.id}`)}>
                    <td>{school.name}</td>
                    <td>{school.city || '—'}</td>
                    <td>{school.phone || '—'}</td>
                    <td>{school.contactCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
