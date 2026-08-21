import { redirect } from 'next/navigation'

// No public site yet — the MVP is the Payload admin panel plus the planning
// grid (Phase 2), which will live under its own route once built.
export default function Home() {
  redirect('/admin')
}
