'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'

/**
 * State that resets to `computeInitial()` whenever `key` changes — the
 * "adjust state during render" pattern React's own docs recommend
 * instead of `useEffect(() => setState(...), [key])`, which causes an
 * extra render-then-effect-then-render cascade (and trips this project's
 * lint rule for exactly that reason). Used for the list pages' search
 * box (resets to the URL's `q` after a navigation completes) and bulk
 * selection (clears whenever the page's own data changes, e.g. after a
 * bulk delete or paging).
 */
export function useResetState<T>(key: unknown, computeInitial: () => T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(computeInitial)
  const [prevKey, setPrevKey] = useState(key)

  if (key !== prevKey) {
    setPrevKey(key)
    setState(computeInitial())
    return [computeInitial(), setState]
  }

  return [state, setState]
}
