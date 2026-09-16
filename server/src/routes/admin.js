import { Router } from 'express'

import {
  snapshot,
  openRound,
  closeRound,
  decideTie,
  resetTournament,
  revealChampion,
  hideChampion,
} from '../tournament.js'
import { guestRoster, removeGuest } from '../guests.js'
import { requireAdmin } from '../middleware.js'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

/** Cheap way for the admin screen to validate a typed token. */
adminRouter.get('/ping', (_req, res) => {
  res.json({ ok: true })
})

/** Snapshot plus the roster, which guests never see. */
adminRouter.get('/state', (_req, res) => {
  res.json({ ...snapshot(), guests: guestRoster() })
})

adminRouter.post('/round/open', (_req, res, next) => {
  try {
    openRound()
    res.json({ ok: true, ...snapshot() })
  } catch (err) {
    next(err)
  }
})

adminRouter.post('/round/close', (_req, res, next) => {
  try {
    const result = closeRound()
    res.json({ ok: true, result, ...snapshot() })
  } catch (err) {
    next(err)
  }
})

/** Settle a tie: { bearId } to pick, or { bearId: 'random' } to flip a coin. */
adminRouter.post('/matchups/:id/decide', (req, res, next) => {
  try {
    const result = decideTie(Number(req.params.id), req.body?.bearId)
    res.json({ ok: true, result, ...snapshot() })
  } catch (err) {
    next(err)
  }
})

adminRouter.post('/champion/reveal', (_req, res, next) => {
  try {
    revealChampion()
    res.json({ ok: true, ...snapshot() })
  } catch (err) {
    next(err)
  }
})

adminRouter.post('/champion/hide', (_req, res, next) => {
  try {
    hideChampion()
    res.json({ ok: true, ...snapshot() })
  } catch (err) {
    next(err)
  }
})

adminRouter.post('/reset', (req, res, next) => {
  try {
    resetTournament({ keepGuests: req.body?.keepGuests !== false })
    res.json({ ok: true, ...snapshot() })
  } catch (err) {
    next(err)
  }
})

adminRouter.delete('/guests/:id', (req, res, next) => {
  try {
    removeGuest(Number(req.params.id))
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
