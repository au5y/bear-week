import { useEffect } from 'react'
import confetti from 'canvas-confetti'

const AUTUMN = ['#f3b229', '#f4795b', '#f2a6a0', '#2f5d3a', '#7b4b2a', '#fff5e4']

/**
 * Celebratory burst for the champion reveal: two side cannons, then a slow
 * drizzle. Sits out entirely if the viewer prefers reduced motion.
 */
export function Confetti({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const fire = () => {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { x: 0.05, y: 0.75 },
        angle: 60,
        colors: AUTUMN,
        scalar: 1.3,
      })
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { x: 0.95, y: 0.75 },
        angle: 120,
        colors: AUTUMN,
        scalar: 1.3,
      })
    }

    fire()
    const burst = window.setTimeout(fire, 700)

    // Gentle ongoing drizzle so the TV keeps sparkling during the speeches.
    const drizzle = window.setInterval(() => {
      confetti({
        particleCount: 14,
        spread: 120,
        startVelocity: 18,
        ticks: 260,
        origin: { x: Math.random(), y: -0.1 },
        colors: AUTUMN,
        scalar: 1.1,
        gravity: 0.65,
      })
    }, 900)

    return () => {
      window.clearTimeout(burst)
      window.clearInterval(drizzle)
      confetti.reset()
    }
  }, [active])

  return null
}
