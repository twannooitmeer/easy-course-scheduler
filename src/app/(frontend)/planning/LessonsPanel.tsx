'use client'

import { useState, useTransition } from 'react'

import type { Lesson } from '@/payload-types'
import { updateLesson, type LessonUpdateInput } from './actions'
import { fromDateInputValue, fromTimeInputValue, toDateInputValue, toTimeInputValue } from './dateHelpers'
import { STATUS_OPTIONS, type TeacherOption } from './types'

function LessonRow({
  lesson,
  teacherOptions,
}: {
  lesson: Lesson
  teacherOptions: TeacherOption[]
}) {
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
        setError('Could not save — try again')
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
        <select
          multiple
          className="cell-select"
          value={local.teacherIds.map(String)}
          onChange={(e) => {
            const ids = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
            setLocal((s) => ({ ...s, teacherIds: ids }))
            save({ teachers: ids })
          }}
        >
          {teacherOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.displayName}
            </option>
          ))}
        </select>
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
        {isPending && <span className="saving-dot" title="Saving…" />}
        {error && <span style={{ color: '#b91c1c', fontSize: '0.72rem' }}>{error}</span>}
      </td>
    </tr>
  )
}

export function LessonsPanel({
  lessons,
  teacherOptions,
}: {
  lessons: Lesson[]
  teacherOptions: TeacherOption[]
}) {
  if (lessons.length === 0) {
    return (
      <div className="lessons-panel">
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', margin: 0 }}>
          No lessons generated for this booking — the program may have no lesson templates yet.
        </p>
      </div>
    )
  }

  return (
    <div className="lessons-panel">
      <table className="lessons-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Start</th>
            <th>End</th>
            <th>Teachers</th>
            <th>Location</th>
            <th>Students</th>
            <th>Status</th>
            <th>Remark</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} teacherOptions={teacherOptions} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
