'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'

import type { LessonTemplate, Program, Teacher } from '@/payload-types'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { useLocale } from '../i18n/LocaleProvider'
import { AddLessonTemplateDialog } from './AddLessonTemplateDialog'
import { deleteLessonTemplate, updateProgram, type ProgramInput } from './actions'

function teacherName(teacher: LessonTemplate['defaultTeacher'], none: string): string {
  if (!teacher) return none
  return typeof teacher === 'object' ? teacher.displayName : `#${teacher}`
}

export function ProgramDetail({
  program,
  lessonTemplates,
  teachers,
}: {
  program: Program
  lessonTemplates: LessonTemplate[]
  teachers: Teacher[]
}) {
  const { t } = useLocale()
  const [form, setForm] = useState<ProgramInput>({
    name: program.name,
    description: program.description ?? '',
    soort: program.soort,
    defaultLessonCount: program.defaultLessonCount ?? undefined,
    defaultLessonDurationMinutes: program.defaultLessonDurationMinutes ?? undefined,
    price: program.price ?? undefined,
    active: program.active ?? true,
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const confirmRef = useRef<ConfirmDialogHandle>(null)

  function save(patch: ProgramInput) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateProgram(program.id, patch)
      if (result.success) {
        setSaved(true)
      } else {
        setError(result.error)
      }
    })
  }

  function textField<K extends keyof ProgramInput>(key: K) {
    return {
      value: (form[key] as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
      onBlur: () => save({ [key]: form[key] }),
    }
  }

  function numberField<K extends keyof ProgramInput>(key: K) {
    return {
      value: (form[key] as number | undefined) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value === '' ? undefined : Number(e.target.value) })),
      onBlur: () => save({ [key]: form[key] }),
    }
  }

  function handleSoortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = (e.target.value || undefined) as ProgramInput['soort']
    setForm((f) => ({ ...f, soort: value }))
    save({ soort: value })
  }

  function handleActiveChange(e: React.ChangeEvent<HTMLInputElement>) {
    const active = e.target.checked
    setForm((f) => ({ ...f, active }))
    save({ active })
  }

  async function handleRemoveLessonTemplate(template: LessonTemplate) {
    const ok = await confirmRef.current?.confirm(t('programs.confirmRemoveLesson', { seq: template.sequenceNo }))
    if (!ok) return
    const result = await deleteLessonTemplate(template.id, program.id)
    if (!result.success) setError(result.error)
  }

  return (
    <div className="page">
      <Link href="/programs" className="back-link">
        {t('programs.backLink')}
      </Link>
      <div className="page-header">
        <div>
          <h1>{program.name}</h1>
          <p className="subtitle">
            {isPending && <span className="saving-dot" title={t('common.saving')} />}
            {saved && !isPending && <span className="saved-hint"> {t('common.saved')}</span>}
          </p>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <form className="record-form" onSubmit={(e) => e.preventDefault()}>
        <label className="field-full">
          {t('programs.fieldName')}
          <input type="text" {...textField('name')} required />
        </label>
        <label>
          {t('programs.fieldSoort')}
          {/* Soort option labels stay in Dutch on purpose — see ProgramsList.tsx SOORT_LABEL comment. */}
          <select value={form.soort ?? ''} onChange={handleSoortChange}>
            <option value="">{t('programs.soortNone')}</option>
            <option value="regulier">Regulier</option>
            <option value="maatwerk">Maatwerk</option>
            <option value="cmk">CMK</option>
            <option value="kbw">KBW</option>
          </select>
        </label>
        <label>
          {t('programs.fieldPrice')}
          <input type="number" min={0} {...numberField('price')} />
        </label>
        <label>
          {t('programs.fieldDefaultLessonCount')}
          <input type="number" min={1} {...numberField('defaultLessonCount')} />
        </label>
        <label>
          {t('programs.fieldDefaultLessonDuration')}
          <input type="number" min={1} {...numberField('defaultLessonDurationMinutes')} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.active ?? true} onChange={handleActiveChange} />
          {t('programs.fieldActive')}
        </label>
        <label className="field-full">
          {t('programs.fieldDescription')}
          <textarea {...textField('description')} />
        </label>
      </form>

      <div className="sub-section">
        <div className="sub-section-header">
          <h2>{t('programs.lessonsHeading')}</h2>
          <AddLessonTemplateDialog programId={program.id} teachers={teachers} />
        </div>

        {lessonTemplates.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{t('programs.noLessonsYet')}</p>
        ) : (
          <table className="sub-table">
            <thead>
              <tr>
                <th>{t('programs.lessonColumnSeq')}</th>
                <th>{t('programs.lessonColumnDuration')}</th>
                <th>{t('programs.lessonColumnDefaultTeacher')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lessonTemplates.map((template) => (
                <tr key={template.id}>
                  <td>{template.sequenceNo}</td>
                  <td>{template.durationMinutes ?? t('common.none')} min</td>
                  <td>{teacherName(template.defaultTeacher, t('common.none'))}</td>
                  <td>
                    <button
                      type="button"
                      className="delete-button"
                      aria-label={t('programs.removeLesson')}
                      title={t('programs.removeLesson')}
                      onClick={() => handleRemoveLessonTemplate(template)}
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

      <ConfirmDialog ref={confirmRef} />
    </div>
  )
}
