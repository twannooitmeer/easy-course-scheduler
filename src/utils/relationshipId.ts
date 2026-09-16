/**
 * A relationship field's value on a Payload doc is the raw ID only when the
 * triggering request used `depth: 0`. The Local API defaults to depth 2, so
 * a relationship field is just as likely to arrive already populated as
 * `{ id, ... }` — passing that whole object into a `where.equals` clause
 * (or into another `payload.find`/`payload.create` call) produced a real
 * "invalid input syntax for type integer: NaN" Postgres error the first
 * time this was hit, in `generateLessonsFromBooking.ts`. Shared here so
 * every hook that reads a relationship field off `doc`/`previousDoc`
 * normalizes it the same way.
 */
export function relationshipId(value: unknown): number {
  if (value && typeof value === 'object' && 'id' in value) {
    return Number((value as { id: number | string }).id)
  }
  return Number(value)
}
