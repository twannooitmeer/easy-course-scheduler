import type { Access, FieldAccess } from 'payload'

/**
 * MVP access model: every logged-in user is internal staff. There is a
 * single `users` auth collection and no public self-registration.
 *
 * A later phase can add teacher/school portal accounts as separate auth
 * collections (e.g. `teachers`, `schools-portal`), each with `auth: true`
 * and its own access rules. When that lands, replace `isAuthenticated` on
 * the collections that must stay staff-only with a real `isStaff` check
 * keyed on `user.collection`.
 *
 * ---
 *
 * ## What `role` means (defined here, once)
 *
 * `Users.role` (see `src/collections/Users.ts`) is a two-value enum:
 *
 * - `"admin"` — a staff member who can additionally manage organisation-wide,
 *   deployment-level configuration: branding (the `site-settings` global —
 *   name/logo), and anything else gated on {@link hasAdminRole} below. An
 *   admin can do everything a `"staff"` user can do, plus these surfaces.
 * - `"staff"` — the default for every day-to-day internal user. Full access
 *   to master data (Schools, Teachers, Programs, Contacts, Lesson Templates)
 *   and the planning grid (Bookings, Lessons) — there is no read-only or
 *   per-record restriction among staff. `staff` cannot change organisation
 *   branding.
 *
 * `role` is **not** the same axis as `isAuthenticated` below: every route and
 * collection that only needs "is this a signed-in internal user" (i.e. almost
 * everything in this app) should keep using `isAuthenticated`/`requireUser()`
 * regardless of `role`. Reach for `role`/`hasAdminRole` only when a surface is
 * genuinely organisation-wide rather than day-to-day staff work — the bar
 * `site-settings` already sets. Adding a new admin-only surface should read
 * `role` through `hasAdminRole`/`isAdmin` from this file rather than
 * re-checking `user.role === 'admin'` inline, so the definition stays in one
 * place as more surfaces adopt it.
 *
 * `role` is also unrelated to the future teacher/school portal described
 * above — a portal account will be a different collection entirely, not a
 * third value of this enum.
 */

export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAuthenticatedField: FieldAccess = ({ req: { user } }) => Boolean(user)

export const anyone: Access = () => true

/**
 * Plain predicate version of the admin check, usable outside a Payload
 * `Access`/`FieldAccess` context (e.g. a Server Component reading the
 * session user directly) so there is exactly one place that knows what
 * `role === 'admin'` means. See the `role` doc comment above.
 */
export function hasAdminRole(user: { role?: string | null } | null | undefined): boolean {
  return user?.role === 'admin'
}

/**
 * Payload `Access` wrapper around {@link hasAdminRole}, for collection/global
 * `access` blocks. Currently gates the organisation-wide `site-settings`
 * global (name/logo) — see the `role` doc comment above for the intended
 * scope of "admin-only".
 */
export const isAdmin: Access = ({ req: { user } }) => hasAdminRole(user)
