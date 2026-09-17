import { useEffect, useState } from 'react'

/**
 * Seconds left until `deadline`, ticking locally once a second.
 *
 * The server sends an absolute timestamp plus its own clock reading, so a TV
 * whose clock is minutes off still shows the same number as everyone's phone:
 * we measure the gap between the two and correct for it. Returns null when
 * there is no deadline, and 0 once it has passed.
 */
export function useCountdown(
  deadline: string | null,
  serverTime: string | null
): number | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadline) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadline])

  if (!deadline) return null

  const target = Date.parse(deadline)
  if (Number.isNaN(target)) return null

  // Positive when this device's clock runs ahead of the server's.
  const skew = serverTime ? now - Date.parse(serverTime) : 0
  const remaining = Math.round((target - (now - (Number.isNaN(skew) ? 0 : skew))) / 1000)

  return Math.max(0, remaining)
}

/** 125 -> "2:05". Minutes only; nobody schedules an hour-long snack break. */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
