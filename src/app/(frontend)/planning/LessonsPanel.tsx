'use client'

import { useRef, useState, useTransition } from 'react'

import type { Lesson } from '@/payload-types'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { useLocale } from '../i18n/LocaleProvider'
import { createLesson, deleteLesson, updateLesson, type LessonUpdateInput } from './actions'
import { fromDateInputValue, fromTimeInputValue, toDateInputValue, toTimeInputValue } from './dateHelpers'
import { TeacherPicker } from './TeacherPicker'
import { STATUS_OPTIONS, type TeacherOption } from './types'

function LessonRow({
  lesson,
  teacherOptions,
  onRequestDelete,
}: {
  lesson: Lesson
  teacherOptions: TeacherOption[]
  onRequestDelete: (id: number) => void
}) {
  const { t } = useLocale()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [local, setLocal] = useState(() => ({
    lessonDate: toDateInputValue(lesson.lessonDate),
    startTime: toTimeInputValue(lesson.startTime),
    endTime: toTimeInputValue(lesson.endTime),
    location: lesson.location ?? '',
    studentCount: lesson.studentCount ?? '',
    remark: lesson.remark ?? '',
    teacherIds: (lesson.teachers ?? []).map((t) => (typeof t === 'object' ? t.id : t)),
    status: lesson.status,
  }))

  function save(data: LessonUpdateInput) {
    setError(null)
    startTransition(async () => {
      try {
        await updateLesson(lesson.id, data)
      } catch {
        setError(t('planning.saveError'))
      }
    })
  }

  return (
    <tr>
      <td>{lesson.sequenceNo}</td>
      <td>
        <input
          type="date"
          className="cell-input"
          value={local.lessonDate}
          onChange={(e) => setLocal((s) => ({ ...s, lessonDate: e.target.value }))}
          onBlur={() => save({ lessonDate: fromDateInputValue(local.lessonDate) ?? undefined })}
        />
      </td>
      <td>
        <input
          type="time"
          className="cell-input narrow"
          value={local.startTime}
          onChange={(e) => setLocal((s) => ({ ...s, startTime: e.target.value }))}
          onBlur={() => save({ startTime: fromTimeInputValue(local.startTime) })}
        />
      </td>
      <td>
        <input
          type="time"
          className="cell-input narrow"
          value={local.endTime}
          onChange={(e) => setLocal((s) => ({ ...s, endTime: e.target.value }))}
          onBlur={() => save({ endTime: fromTimeInputValue(local.endTime) })}
        />
      </td>
      <td>
        <TeacherPicker
          selectedIds={local.teacherIds}
          options={teacherOptions}
          onChange={(ids) => {
            setLocal((s) => ({ ...s, teacherIds: ids }))
            save({ teachers: ids })
          }}
        />
      </td>
      <td>
        <input
          type="text"
          className="cell-input"
          value={local.location}
          onChange={(e) => setLocal((s) => ({ ...s, location: e.target.value }))}
          onBlur={() => save({ location: local.location })}
        />
      </td>
      <td>
        <input
          type="number"
          min={0}
          className="cell-input narrow"
          value={local.studentCount}
          onChange={(e) =>
            setLocal((s) => ({ ...s, studentCount: e.target.value === '' ? '' : Number(e.target.value) }))
          }
          onBlur={() =>
            save({ studentCount: local.studentCount === '' ? null : Number(local.studentCount) })
          }
        />
      </td>
      <td>
        <select
          className="cell-select"
          value={local.status}
          onChange={(e) => {
            const status = e.target.value as Lesson['status']
            setLocal((s) => ({ ...s, status }))
            save({ status })
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="text"
          className="cell-input"
          value={local.remark}
          onChange={(e) => setLocal((s) => ({ ...s, remark: e.target.value }))}
          onBlur={() => save({ remark: local.remark })}
        />
      </td>
      <td>
        {isPending && <span className="saving-dot" title={t('common.saving')} />}
        {error && <span style={{ color: '#b91c1c', fontSize: '0.72rem' }}>{error}</span>}
      </td>
      <td>
        <button
          type="button"
          className="delete-button"
          aria-label={t('planning.removeLesson')}
          title={t('planning.removeLesson')}
          onClick={() => onRequestDelete(lesson.id)}
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

export function LessonsPanel({
  bookingId,
  lessons,
  teacherOptions,
}: {
  bookingId: number
  lessons: Lesson[]
  teacherOptions: TeacherOption[]
}) {
  const { t } = useLocale()
  const confirmRef = useRef<ConfirmDialogHandle>(null)
  const [isAdding, startAddTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleRequestDelete(lessonId: number) {
    const ok = await confirmRef.current?.confirm(t('planning.confirmRemoveLesson'))
    if (!ok) return

    setError(null)
    const result = await deleteLesson(lessonId)
    if (!result.success) setError(result.error)
  }

  function handleAddLesson() {
    setError(null)
    startAddTransition(async () => {
      const result = await createLesson(bookingId)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="lessons-panel">
      {error && <p className="error-banner">{error}</p>}

      {lessons.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{t('planning.emptyLessons')}</p>
      ) : (
        <table className="lessons-table">
          <thead>
            <tr>
              <th>{t('planning.lessonColumnSeq')}</th>
              <th>{t('planning.lessonColumnDate')}</th>
              <th>{t('planning.lessonColumnStart')}</th>
              <th>{t('planning.lessonColumnEnd')}</th>
              <th>{t('planning.lessonColumnTeachers')}</th>
              <th>{t('planning.lessonColumnLocation')}</th>
              <th>{t('planning.lessonColumnStudents')}</th>
              <th>{t('planning.lessonColumnStatus')}</th>
              <th>{t('planning.lessonColumnRemark')}</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                teacherOptions={teacherOptions}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </tbody>
        </table>
      )}

      <button type="button" className="icon-button add-lesson-button" onClick={handleAddLesson} disabled={isAdding}>
        {isAdding ? t('planning.addingLesson') : t('planning.addLesson')}
      </button>

      <ConfirmDialog ref={confirmRef} />
    </div>
  )
}
