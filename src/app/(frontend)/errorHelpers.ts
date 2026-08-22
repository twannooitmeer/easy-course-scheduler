/**
 * Payload throws a `ValidationError` for a `unique: true` field collision
 * (Schools.name, Teachers.displayName, Programs.name) with a generic
 * top-level message ("The following field is invalid: name") that isn't
 * actionable on its own. This detects that specific case from the error's
 * `.data.errors` shape so callers can show a real "already exists" message
 * instead.
 */
export function isUniqueFieldViolation(err: unknown, path: string): boolean {
  if (!(err instanceof Error)) return false
  const data = (err as { data?: unknown }).data
  if (!data || typeof data !== 'object' || !('errors' in data)) return false
  const errors = (data as { errors?: unknown }).errors
  if (!Array.isArray(errors)) return false
  return errors.some(
    (e) => e && typeof e === 'object' && 'path' in e && (e as { path?: unknown }).path === path,
  )
}
