import { useCallback, useEffect, useRef, useState } from 'react'

interface PollResult<T> {
  data: T | null
  error: string | null
  /** True only for the very first load, so screens can show a splash once. */
  loading: boolean
  refresh: () => void
}

/**
 * Poll an async function on an interval.
 *
 * A few seconds of lag is fine for a party, and plain polling survives every
 * tunnel, proxy and flaky house-wifi setup that breaks SSE and websockets.
 *
 * Pauses while the tab is hidden (a phone in a pocket should not keep hammering
 * the server) and refreshes immediately when it comes back.
 */
export function usePoll<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs = 2000,
  enabled = true
): PollResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Keep the latest fetcher in a ref so callers can pass an inline closure
  // without restarting the interval on every render.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    let timer: number | undefined
    let controller: AbortController | undefined
    // Guards against two poll chains running at once: without it, a tab that
    // becomes visible mid-request starts a second chain while the in-flight
    // request's `finally` schedules a third, and every hide/show multiplies it.
    let inFlight = false

    const run = async () => {
      if (cancelled || inFlight) return

      if (document.hidden) {
        schedule()
        return
      }

      inFlight = true
      controller = new AbortController()
      try {
        const next = await fetcherRef.current(controller.signal)
        if (cancelled) return
        setData(next)
        setError(null)
      } catch (err) {
        if (cancelled || (err as Error).name === 'AbortError') return
        setError((err as Error).message)
      } finally {
        inFlight = false
        if (!cancelled) {
          setLoading(false)
          schedule()
        }
      }
    }

    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(run, intervalMs)
    }

    const onVisible = () => {
      // A request already in flight will schedule the next tick itself.
      if (!document.hidden && !inFlight) {
        window.clearTimeout(timer)
        run()
      }
    }

    run()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs, enabled, tick])

  return { data, error, loading, refresh }
}
