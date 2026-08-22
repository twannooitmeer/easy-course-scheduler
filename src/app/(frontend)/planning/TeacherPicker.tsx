'use client'

import { useRef } from 'react'

import { useLocale } from '../i18n/LocaleProvider'
import type { TeacherOption } from './types'

export function TeacherPicker({
  selectedIds,
  options,
  onChange,
}: {
  selectedIds: number[]
  options: TeacherOption[]
  onChange: (ids: number[]) => void
}) {
  const { t } = useLocale()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const selected = options.filter((o) => selectedIds.includes(o.id))

  function toggle(id: number) {
    const next = selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]
    onChange(next)
  }

  function remove(id: number) {
    onChange(selectedIds.filter((i) => i !== id))
  }

  return (
    <div className="teacher-picker">
      <div className="teacher-chips">
        {selected.map((teacher) => (
          <span key={teacher.id} className="teacher-chip">
            {teacher.displayName}
            <button
              type="button"
              className="teacher-chip-remove"
              onClick={() => remove(teacher.id)}
              aria-label={t('teacherPicker.removeTeacher', { name: teacher.displayName })}
            >
              ×
            </button>
          </span>
        ))}
        <button type="button" className="teacher-picker-add" onClick={() => dialogRef.current?.showModal()}>
          {selected.length === 0 ? t('teacherPicker.addPlaceholderEmpty') : t('teacherPicker.addPlaceholderMore')}
        </button>
      </div>

      <dialog ref={dialogRef} className="teacher-picker-dialog">
        <h2>{t('teacherPicker.dialogTitle')}</h2>
        <div className="teacher-picker-options">
          {options.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{t('teacherPicker.noTeachersYet')}</p>
          ) : (
            options.map((teacher) => (
              <label key={teacher.id} className="checkbox-row">
                <input type="checkbox" checked={selectedIds.includes(teacher.id)} onChange={() => toggle(teacher.id)} />
                {teacher.displayName}
              </label>
            ))
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="primary" onClick={() => dialogRef.current?.close()}>
            {t('common.done')}
          </button>
        </div>
      </dialog>
    </div>
  )
}
