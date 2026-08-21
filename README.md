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
pnpm test
```

Covers the booking → lesson-generation hook: correct sequencing and dating,
no duplicate generation on a later update, and the no-templates-yet case
failing safely instead of throwing. Runs against the same dev database, so
`beforeAll` clears the relevant collections first.

## Deployment

```bash
docker compose --env-file .env.prod \
  -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --build
```

See the comments in `docker-compose.prod.yml` for the network/proxy
assumptions (an external `edge` network your reverse proxy is already on).

**No real migrations exist yet** — set `ALLOW_SCHEMA_PUSH=true` in
`.env.prod` for now so Payload pushes the schema on boot (otherwise a
fresh production database has no tables at all: `relation "users" does
not exist`). Generate and commit real migrations with `payload
migrate:create` before this holds any real data you can't afford to lose
to an auto-push, then stop setting `ALLOW_SCHEMA_PUSH`.

## Roadmap

- [x] Scaffold: Payload collections for the full data model
- [x] Booking → lesson generation hook, with tests
- [x] Bilingual (EN/NL) admin UI and field labels
- [ ] Real migrations (`payload migrate:create`), replacing `ALLOW_SCHEMA_PUSH`
- [ ] Custom planning grid (grouped/expandable by program, sorted by start date)
- [ ] Combinable filters (school/teacher/class/month/program)
- [ ] PDF export
- [ ] Status-change email notifications (Resend)

Out of scope for now: a teacher/school self-service portal (a separately
scoped phase — real external accounts and permission boundaries are
materially more work than the internal tool above).
