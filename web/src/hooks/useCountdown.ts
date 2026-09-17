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

  /**
   * How far this device's clock runs ahead of the server's, sampled once per
   * fresh reading rather than on every tick.
   *
   * Sampling it every render is what made the clock skip: `serverTime` only
   * changes when a poll lands, so a skew of `now - serverTime` grew by a second
   * with every tick and cancelled the tick out. The countdown then moved only
   * when a poll arrived -- two seconds at a time, showing 1:05 then 1:03.
   */
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!serverTime) return
    const parsed = Date.parse(serverTime)
    if (!Number.isNaN(parsed)) setOffset(Date.now() - parsed)
  }, [serverTime])

  useEffect(() => {
    if (!deadline) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadline])

  if (!deadline) return null

  const target = Date.parse(deadline)
  if (Number.isNaN(target)) return null

  // Ceiling, not rounding: with 1.4s left the clock should still read 2, the
  // way every kitchen timer does. Rounding shows each number for half a second
  // either side of the tick and can repeat or drop one as the interval drifts.
  const remaining = Math.ceil((target - (now - offset)) / 1000)

  return Math.max(0, remaining)
}

/** 125 -> "2:05". Minutes only; nobody schedules an hour-long snack break. */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
