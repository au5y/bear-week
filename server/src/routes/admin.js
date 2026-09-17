import { Router } from 'express'

import {
  snapshot,
  openRound,
  closeRound,
  decideTie,
  resetTournament,
  revealChampion,
  hideChampion,
  startIntermission,
  endIntermission,
  setRoundDeadline,
  clearRoundDeadline,
} from '../tournament.js'
import { guestRoster, removeGuest } from '../guests.js'
import { requireAdmin } from '../middleware.js'

export const adminRouter = Router()

// requireAdmin throttles wrong-token attempts per IP, so this router cannot be
// used to guess ADMIN_TOKEN at speed. A correct token is never throttled -- the
// console polls every couple of seconds.
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

/** Put a clock on the open round: { minutes }. It closes itself when it runs out. */
adminRouter.post('/round/deadline', (req, res, next) => {
  try {
    const result = setRoundDeadline(req.body?.minutes)
    res.json({ ok: true, result, ...snapshot() })
  } catch (err) {
    next(err)
  }
})

adminRouter.delete('/round/deadline', (_req, res, next) => {
  try {
    clearRoundDeadline()
    res.json({ ok: true, ...snapshot() })
  } catch (err) {
    next(err)
  }
})

/** Call a break: { minutes } sets the clock every screen counts down to. */
adminRouter.post('/intermission/start', (req, res, next) => {
  try {
    const result = startIntermission(req.body?.minutes)
    res.json({ ok: true, result, ...snapshot() })
  } catch (err) {
    next(err)
  }
})

adminRouter.post('/intermission/end', (_req, res, next) => {
  try {
    endIntermission()
    res.json({ ok: true, ...snapshot() })
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
