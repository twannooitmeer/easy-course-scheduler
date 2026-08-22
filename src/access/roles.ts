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
 */

export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAuthenticatedField: FieldAccess = ({ req: { user } }) => Boolean(user)

export const anyone: Access = () => true

/**
 * First real use of the `role` field beyond display: gates the
 * organisation-wide SiteSettings global (name/logo) to admins, since that
 * affects every user's nav, not just the editor's own records.
 */
export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'
