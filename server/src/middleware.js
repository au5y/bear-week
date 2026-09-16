import { timingSafeEqual } from 'node:crypto'

import { env } from './env.js'
import { findGuestByToken } from './guests.js'

/** Attaches req.guest when a valid guest token is present. Never rejects. */
export function attachGuest(req, _res, next) {
  const header = req.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
  const token = bearer || req.get('x-guest-token') || ''

  req.guest = findGuestByToken(token.trim())
  next()
}

export function requireGuest(req, res, next) {
  if (!req.guest) {
    return res
      .status(401)
      .json({ error: 'Join the party first -- we need a name to put on your ballot.' })
  }
  next()
}

function constantTimeEquals(a, b) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function requireAdmin(req, res, next) {
  const header = req.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
  const token = (bearer || req.get('x-admin-token') || '').trim()

  if (!token || !constantTimeEquals(token, env.adminToken)) {
    return res.status(401).json({ error: 'Host token is wrong. Only the zookeeper gets this screen.' })
  }
  next()
}

/**
 * Crude per-IP write limiter. Not a security boundary -- just stops a runaway
 * script or a stuck retry loop from filling the votes table at a house party.
 */
export function writeLimiter({ limit = 120, windowMs = 60_000 } = {}) {
  const buckets = new Map()

  // Keep the map from growing forever over a long evening.
  const sweep = setInterval(() => {
    const cutoff = Date.now() - windowMs
    for (const [ip, bucket] of buckets) {
      if (bucket.start < cutoff) buckets.delete(ip)
    }
  }, windowMs)
  sweep.unref()

  return (req, res, next) => {
    const ip = req.ip ?? 'unknown'
    const now = Date.now()
    const bucket = buckets.get(ip)

    if (!bucket || now - bucket.start > windowMs) {
      buckets.set(ip, { start: now, count: 1 })
      return next()
    }

    bucket.count += 1
    if (bucket.count > limit) {
      return res.status(429).json({ error: 'Whoa there. Slow down and try again in a minute.' })
    }
    next()
  }
}

/** Single error funnel so TournamentError statuses surface correctly. */
export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500
  if (status >= 500) console.error(err)
  res.status(status).json({ error: err.message || 'Something went sideways.' })
}
