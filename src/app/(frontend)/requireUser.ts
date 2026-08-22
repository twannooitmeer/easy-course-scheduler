import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'

/**
 * Every Server Action across the app calls this and passes the resolved
 * user + `overrideAccess: false` into its Payload call — the Local API
 * bypasses collection access control by default, so skipping this would let
 * an unauthenticated request through regardless of a page-level redirect.
 */
export async function requireUser() {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })
  if (!user) {
    throw new Error('Not authenticated')
  }
  return { payload, user }
}
