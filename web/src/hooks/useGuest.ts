import { useCallback, useEffect, useState } from 'react'

import { api, guestToken } from '../api'
import type { Guest } from '../types'

/**
 * Tracks the guest identity stored on this device.
 *
 * On mount we re-validate the stored token against the server, so a guest whose
 * account was removed (or whose token was rotated by rejoining elsewhere) gets
 * bounced back to the join screen instead of silently failing to vote.
 */
export function useGuest() {
  const [guest, setGuest] = useState<Guest | null>(null)
  const [checking, setChecking] = useState(Boolean(guestToken.get()))

  useEffect(() => {
    if (!guestToken.get()) {
      setChecking(false)
      return
    }

    let cancelled = false

    api
      .me()
      .then(({ guest: current }) => {
        if (!cancelled) setGuest(current)
      })
      .catch(() => {
        if (cancelled) return
        guestToken.clear()
        setGuest(null)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback((token: string, current: Guest) => {
    guestToken.set(token)
    setGuest(current)
  }, [])

  const signOut = useCallback(() => {
    guestToken.clear()
    setGuest(null)
  }, [])

  return { guest, checking, signIn, signOut }
}
