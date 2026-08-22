export const PAGE_SIZE = 20

export function parsePageParam(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1
}
