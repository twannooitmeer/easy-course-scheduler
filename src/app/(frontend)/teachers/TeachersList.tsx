'use client'

import { useRef, useState } from 'react'

import type { Teacher } from '@/payload-types'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { deleteTeacher } from './actions'
import { TeacherFormDialog } from './TeacherFormDialog'

export function TeachersList({ teachers }: { teachers: Teacher[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const confirmRef = useRef<ConfirmDialogHandle>(null)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditingTeacher(null)
    dialogRef.current?.showModal()
  }

  function openEdit(teacher: Teacher) {
    setEditingTeacher(teacher)
    dialogRef.current?.showModal()
  }

  async function handleDelete(teacher: Teacher, e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirmRef.current?.confirm(`Remove teacher "${teacher.displayName}"? This cannot be undone.`)
    if (!ok) return

    setError(null)
    const result = await deleteTeacher(teacher.id)
    if (!result.success) setError(result.error)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Teachers</h1>
          <p className="subtitle">People and organisations who teach lessons.</p>
        </div>
        <button type="button" className="admin-link" onClick={openCreate}>
          + New teacher
        </button>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {teachers.length === 0 ? (
        <div className="empty-state">
          <p>No teachers yet.</p>
          <p>Use the + New teacher button above to add one.</p>
        </div>
      ) : (
        <div className="grid-card">
          <div className="grid-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} onClick={() => openEdit(teacher)}>
                    <td>{teacher.displayName}</td>
                    <td>{teacher.kind === 'organisation' ? 'Organisation' : 'Person'}</td>
                    <td>{teacher.email || '—'}</td>
                    <td>{teacher.phone || '—'}</td>
                    <td>{teacher.active === false ? 'No' : 'Yes'}</td>
                    <td>
                      <button type="button" className="icon-button" onClick={(e) => handleDelete(teacher, e)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TeacherFormDialog
        dialogRef={dialogRef}
        editingTeacher={editingTeacher}
        onClose={() => setEditingTeacher(null)}
      />
      <ConfirmDialog ref={confirmRef} />
    </div>
  )
}
