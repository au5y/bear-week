import { Router } from 'express'

import { env } from '../env.js'
import { BEARS } from '../bears.js'
import { VIDEOS } from '../videos.js'
import { snapshot, castVote, TournamentError } from '../tournament.js'
import { joinParty, publicGuest } from '../guests.js'
import { requireGuest, writeLimiter } from '../middleware.js'

export const publicRouter = Router()

const limitWrites = writeLimiter({ limit: 120, windowMs: 60_000 })

/** What the join screen needs to render itself. */
publicRouter.get('/config', (_req, res) => {
  res.json({
    requiresPartyPin: Boolean(env.partyPin),
    voteUrl: env.voteUrl || null,
    pollIntervalMs: 2000,
    /** How many contestants are in the field, so the join screen can say so
     *  without anyone remembering to edit the copy when the field changes. */
    fieldSize: BEARS.length,
    /** What the TV plays during a break. See server/src/videos.js. */
    videos: VIDEOS,
  })
})

/** The one endpoint every screen polls. */
publicRouter.get('/state', (req, res) => {
  res.json(snapshot(req.guest))
})

publicRouter.post('/guests/join', limitWrites, (req, res, next) => {
  try {
    const { name, pin, partyPin } = req.body ?? {}

    if (env.partyPin && String(partyPin ?? '').trim() !== env.partyPin) {
      throw new TournamentError('Wrong party password. Ask the host.', 401, 'party_pin_wrong')
    }

    const result = joinParty(name, pin)
    res.status(result.returning ? 200 : 201).json(result)
  } catch (err) {
    next(err)
  }
})

/** Lets a returning phone confirm its stored token is still good. */
publicRouter.get('/guests/me', requireGuest, (req, res) => {
  res.json({ guest: publicGuest(req.guest) })
})

publicRouter.post('/votes', limitWrites, requireGuest, (req, res, next) => {
  try {
    const matchupId = Number(req.body?.matchupId)
    const bearId = String(req.body?.bearId ?? '')

    if (!Number.isInteger(matchupId)) {
      throw new TournamentError('Which matchup? Send a matchupId.')
    }

    const result = castVote(req.guest.id, matchupId, bearId)
    res.status(result.created ? 201 : 200).json({ ok: true, matchupId, ...result })
  } catch (err) {
    next(err)
  }
})
