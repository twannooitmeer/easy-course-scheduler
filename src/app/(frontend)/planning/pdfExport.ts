import type { Locale } from '../i18n/locale'
import { t } from '../i18n/t'
import { toDateInputValue, toTimeInputValue } from './dateHelpers'
import { statusLabel, teacherNames } from './format'
import type { BookingWithLessons } from './types'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Renders the whole planning grid (every booking + its generated lessons) as
 * a self-contained, print-styled HTML document -- fed to Puppeteer's
 * page.setContent() rather than navigated to as a real route, so the export
 * route needs no separate auth-forwarding step: the data is already fetched
 * and authorized by the time this runs.
 */
export function buildPlanningPdfHtml(bookings: BookingWithLessons[], locale: Locale, generatedAt: Date): string {
  const rows = bookings
    .map((booking) => {
      const school = typeof booking.school === 'object' ? booking.school.name : String(booking.school)
      const program = typeof booking.program === 'object' ? booking.program.name : String(booking.program)
      const lessonRows = booking.lessons
        .map(
          (lesson) => `
            <tr>
              <td>${lesson.sequenceNo}</td>
              <td>${escapeHtml(toDateInputValue(lesson.lessonDate))}</td>
              <td>${escapeHtml(toTimeInputValue(lesson.startTime))}</td>
              <td>${escapeHtml(toTimeInputValue(lesson.endTime))}</td>
              <td>${escapeHtml(teacherNames(lesson))}</td>
              <td>${escapeHtml(lesson.location ?? '')}</td>
              <td>${lesson.studentCount ?? ''}</td>
              <td>${escapeHtml(statusLabel(lesson.status))}</td>
              <td>${escapeHtml(lesson.remark ?? '')}</td>
            </tr>`,
        )
        .join('')

      return `
        <section class="booking">
          <h2>
            ${escapeHtml(school)} &mdash; ${escapeHtml(program)}
            ${booking.groupLabel ? `<span class="group">${escapeHtml(booking.groupLabel)}</span>` : ''}
            <span class="status">${escapeHtml(statusLabel(booking.status))}</span>
          </h2>
          ${
            booking.lessons.length > 0
              ? `<table>
                  <thead>
                    <tr>
                      <th>${t(locale, 'planning.lessonColumnSeq')}</th>
                      <th>${t(locale, 'planning.lessonColumnDate')}</th>
                      <th>${t(locale, 'planning.lessonColumnStart')}</th>
                      <th>${t(locale, 'planning.lessonColumnEnd')}</th>
                      <th>${t(locale, 'planning.lessonColumnTeachers')}</th>
                      <th>${t(locale, 'planning.lessonColumnLocation')}</th>
                      <th>${t(locale, 'planning.lessonColumnStudents')}</th>
                      <th>${t(locale, 'planning.lessonColumnStatus')}</th>
                      <th>${t(locale, 'planning.lessonColumnRemark')}</th>
                    </tr>
                  </thead>
                  <tbody>${lessonRows}</tbody>
                </table>`
              : `<p class="no-lessons">${escapeHtml(t(locale, 'planning.emptyLessons'))}</p>`
          }
        </section>`
    })
    .join('')

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(t(locale, 'planning.title'))}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1f2430;
    font-size: 11px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 2px solid #1f2430;
    padding-bottom: 6px;
    margin-bottom: 14px;
  }
  header h1 { font-size: 18px; margin: 0; }
  header .generated { color: #5b6270; font-size: 10px; }
  section.booking { break-inside: avoid; margin-bottom: 16px; }
  section.booking h2 {
    font-size: 13px;
    margin: 0 0 6px;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  section.booking h2 .group,
  section.booking h2 .status {
    font-size: 10px;
    font-weight: 500;
    color: #5b6270;
    background: #f1f2f4;
    border-radius: 999px;
    padding: 1px 8px;
  }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    text-align: left;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #5b6270;
    border-bottom: 1px solid #dde1e7;
    padding: 3px 6px;
  }
  tbody td {
    padding: 3px 6px;
    border-bottom: 1px solid #eef0f3;
  }
  p.no-lessons { color: #5b6270; font-style: italic; margin: 0; }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(t(locale, 'planning.title'))}</h1>
    <span class="generated">${escapeHtml(generatedAt.toLocaleString(locale))}</span>
  </header>
  ${rows}
</body>
</html>`
}
