# Easy Course Scheduler

A scheduling tool for education scenarios: any business or organisation
that runs a **recurring lesson series** (a program) and books it onto a
**school or venue**, then needs to manage, adjust, and export the resulting
schedule. Originally built for a Dutch art-education foundation replacing
their Excel-based lesson planning, but the data model has nothing
foundation-specific baked into it — music schools, driving schools, and
similar recurring-course businesses fit the same shape.

Single Next.js 16 + Payload CMS v3 application backed by Postgres.

## Stack

- **Framework:** Next.js 16 (App Router) + Payload CMS v3
- **Database:** Postgres 16 (Payload's own Drizzle adapter, no separate ORM)
- **Auth:** a single Payload `users` auth collection — internal staff only
  for now. No public self-registration yet.
- **License:** AGPL-3.0

## Data model

Programs are reusable lesson templates. Booking a School onto a Program
generates real Lesson rows from the Program's `lesson-templates` (see
`src/hooks/generateLessonsFromBooking.ts`) — auto-populate, then hand-edit.
Every Lesson keeps its own date, time, teacher(s), location, and status
independent of the template afterward.

| Collection         | Purpose |
|---------------------|---------|
| `users`              | Internal staff accounts (Payload auth) |
| `schools`            | Real school/venue records — picking from a list instead of typing free-hand is what stops duplicate name spellings from accumulating |
| `contacts`           | People at a school |
| `teachers`           | A person **or an organisation** (`kind` field) — a real spreadsheet reviewed during design had both acting as "teacher" |
| `programs`           | Reusable lesson-series template; a `soort` field (category/funding type) lives here and defaults onto lessons |
| `lesson-templates`   | One row per lesson slot within a program |
| `bookings`           | A school booked onto a program; `status` replaces a manual cell-colour legend with a real, filterable field |
| `lessons`            | Generated lesson instances; `teachers` is many-to-many for co-taught lessons |
| `closures`           | Study days / holidays per school — kept separate so the lesson grid stays lessons-only |

## Planning grid

`/planning` (auth-gated, redirects to `/admin/login` otherwise) is the
custom view Payload's own admin panel can't render: Bookings grouped by
school/program and sorted by start date, each expandable into its generated
Lessons for inline editing (date, time, teacher(s), location, student
count, status, remark). Built with `@tanstack/react-table` for the outer
grid; edits save through Server Actions (`planning/actions.ts`) that
re-check auth and pass `overrideAccess: false` — the Local API bypasses
collection access control by default, so skipping that would let an
unauthenticated request through regardless of the page-level redirect.

Creating a new Booking is a dialog on this same page (`NewBookingDialog.tsx`,
a native `<dialog>`), not a trip to `/admin` — booking a school onto a
program is central, frequent work for a regular user, unlike the genuinely
one-time setup (schools, teachers, programs, lesson templates) that stays
in the admin panel. The dialog only needs School, Program, an optional
group label, and a start date; it creates the Booking through the same
Server Action path as everything else on this page, which triggers lesson
generation exactly the way creating one via `/admin` always did.

## Notifications

`src/notifications/` sends an email whenever a Booking's or a Lesson's
`status` field changes on an existing record (never on create — a freshly
generated Lesson has no previous status to have changed from). Bookings
notify every Contact at the school; Lessons notify every assigned Teacher
with an email address. Both go through the same `NotificationSender`
interface (`src/notifications/types.ts`):

- `LocalNotificationSender` — logs the email instead of sending it. The
  default whenever `RESEND_API_KEY` or `EMAIL_FROM` isn't set, which is the
  case for local dev and the whole test suite out of the box.
- `ResendNotificationSender` — a plain `fetch` call to the Resend API.
  Selected automatically once both env vars are set (see `.env.example`).

`getNotificationSender()` picks between the two on every call, so nothing
in the codebase (or a deployment) needs to choose a transport explicitly.
Email copy is built in `src/notifications/templates.ts` through the same
`t()`/dictionary system as the rest of the front-end (`src/app/(frontend)/i18n/`,
`notifications.*` keys) — adding a language means adding those keys to a new
dictionary entry, same as any other UI text.

## Roles

`users.role` is `"admin"` or `"staff"` (defaults to `"staff"`). It controls
exactly one thing at this stage: organisation-wide, deployment-level
configuration -- currently just the `site-settings` global (organisation
name/logo, edited at `/admin/globals/site-settings`). Every other collection
(Schools, Teachers, Programs, Bookings, Lessons, Contacts, Lesson Templates)
stays gated on plain authentication regardless of `role` -- day-to-day work
is identical for every signed-in user, and `"admin"` only adds the
organisation-wide surfaces on top of that, it never narrows anything a
`"staff"` user can already do.

The single source of truth is `src/access/roles.ts`: `hasAdminRole(user)` is
the plain predicate (for Server Components reading the session user
directly) and `isAdmin` is the same check wrapped as a Payload `Access`
function (for collection/global `access` blocks). Gate a new admin-only
surface through one of those two rather than re-checking
`user.role === 'admin'` inline, so the definition stays in one place as more
surfaces adopt it.

`role` is unrelated to the teacher/school portal in the roadmap below -- a
portal account will be its own auth collection with its own access rules,
not a third value of this enum.

## Language

Field and collection labels are set as `{ en, nl }` pairs throughout
`src/collections/*.ts`, and the admin UI chrome is fully translated via
Payload's own `@payloadcms/translations` package. Each user picks their
language from their account menu. Adding another language means adding
its Payload translation package and another key to each field's label
object — no architecture change.

## Local development

```bash
docker compose up -d postgres
cp .env.example .env  # then set PAYLOAD_SECRET (openssl rand -hex 32)
pnpm install
pnpm dev               # http://localhost:3001  /  admin at /admin
```

Without Docker locally, point `DATABASE_URL` at a reachable Postgres
instance on port 5433 (or edit the port) before `pnpm dev`.

### Tests

```bash
docker compose up -d postgres
pnpm test          # integration (vitest) + e2e (playwright)
pnpm test:int       # integration only, no browser needed
pnpm test:e2e       # e2e only; starts/reuses the dev server on :3001
```

Integration tests cover the booking → lesson-generation hook (correct
sequencing and dating, no duplicate generation on a later update, the
no-templates-yet case failing safely) and the planning grid's pure
data-shaping logic (date/time input conversion, grouping lessons by
booking). The e2e suite drives the actual planning grid in a real browser:
the auth redirect when logged out, and a full sign-in → expand a booking →
edit a lesson → reload → confirm the edit persisted round trip.

Both suites run against the same dev database, so each has its own
`beforeAll` that clears (or deletes and recreates) its own fixtures first —
skipping that is exactly how a second run accumulated duplicate rows and
broke a locator the first time each suite was written.

## Deployment

On a **fresh database** (first deploy, or after a new migration was added),
run the migrator before starting the app — Payload disables schema
auto-push under `NODE_ENV=production` by design, so an unmigrated database
has no tables at all:

```bash
docker compose --env-file .env.prod -f docker-compose.yml \
  -f docker-compose.prod.yml run --rm migrator

docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --build
```

The migrator builds from the same Dockerfile's `builder` stage (full
toolchain), not the trace-pruned `runner` image the app itself runs from —
the standalone build doesn't include the `payload` CLI at all.

See the comments in `docker-compose.prod.yml` for the network/proxy
assumptions (an external `edge` network your reverse proxy is already on).

**Adding a migration**: after changing a collection, run
`pnpm payload migrate:create` locally, commit the generated file under
`src/migrations/`, then run the migrator again on deploy.

## Roadmap

- [x] Scaffold: Payload collections for the full data model
- [x] Booking → lesson generation hook, with tests
- [x] Bilingual (EN/NL) admin UI and field labels
- [x] Real migrations (`payload migrate:create` + a `migrator` build stage/service)
- [x] Custom planning grid (grouped/expandable by program, sorted by start date), with e2e coverage
- [x] Combinable filters (school/teacher/class/month/program)
- [x] PDF export
- [x] Status-change email notifications (Resend, behind a no-op transport for dev/test — see `src/notifications/`)
- [x] Generic legacy-spreadsheet import (per-deployment config, dry-run by default — see `scripts/legacy-import/`)

Out of scope for now: a teacher/school self-service portal (a separately
scoped phase — real external accounts and permission boundaries are
materially more work than the internal tool above).
