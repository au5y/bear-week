/**
 * Tournament service: everything that reads or mutates bracket state.
 * Routes stay thin and just call into here.
 */

import { db, getMeta, setMeta, deleteMeta } from './db.js'
import { pairBySeed, roundMeta, decideMatchup, roundsRemaining } from './bracket.js'

const CHAMPION_KEY = 'champion_bear'
const REVEALED_KEY = 'champion_revealed'

class TournamentError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export { TournamentError }

/* ------------------------------------------------------------------ reads */

function allBears() {
  return db.prepare('SELECT * FROM bears ORDER BY seed').all()
}

function allRounds() {
  return db.prepare('SELECT * FROM rounds ORDER BY idx').all()
}

function matchupsForRound(roundId) {
  return db
    .prepare('SELECT * FROM matchups WHERE round_id = ? ORDER BY slot')
    .all(roundId)
}

function tallyByMatchup() {
  const rows = db
    .prepare(
      'SELECT matchup_id, bear_id, COUNT(*) AS n FROM votes GROUP BY matchup_id, bear_id'
    )
    .all()

  const tallies = new Map()
  for (const row of rows) {
    if (!tallies.has(row.matchup_id)) tallies.set(row.matchup_id, {})
    tallies.get(row.matchup_id)[row.bear_id] = row.n
  }
  return tallies
}

export function currentRound() {
  return (
    db
      .prepare(
        `SELECT * FROM rounds
         WHERE status IN ('pending', 'open')
         ORDER BY idx
         LIMIT 1`
      )
      .get() ??
    db.prepare('SELECT * FROM rounds ORDER BY idx DESC LIMIT 1').get() ??
    null
  )
}

export function guestCount() {
  return db.prepare('SELECT COUNT(*) AS n FROM guests').get().n
}

/**
 * How many guests have finished the round -- meaning they have voted in every
 * contested matchup in it. Lets the host know when it is safe to close.
 */
function roundTurnout(roundId) {
  const total = guestCount()
  const votable = db
    .prepare(
      'SELECT COUNT(*) AS n FROM matchups WHERE round_id = ? AND is_bye = 0'
    )
    .get(roundId).n

  if (votable === 0) return { finished: total, total, votableMatchups: 0 }

  const finished = db
    .prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT v.guest_id
         FROM votes v
         JOIN matchups m ON m.id = v.matchup_id
         WHERE m.round_id = ? AND m.is_bye = 0
         GROUP BY v.guest_id
         HAVING COUNT(*) >= ?
       )`
    )
    .get(roundId, votable).n

  return { finished, total, votableMatchups: votable }
}

/**
 * The single payload every screen polls. One request, whole world.
 * @param {{id: number}|null} guest
 */
export function snapshot(guest = null) {
  const bears = allBears()
  const bearsById = new Map(bears.map((bear) => [bear.id, bear]))
  const rounds = allRounds()
  const tallies = tallyByMatchup()
  const active = currentRound()

  const championId = getMeta(CHAMPION_KEY)
  const championRevealed = getMeta(REVEALED_KEY) === '1'

  const myVotes = {}
  if (guest) {
    const rows = db
      .prepare('SELECT matchup_id, bear_id FROM votes WHERE guest_id = ?')
      .all(guest.id)
    for (const row of rows) myVotes[row.matchup_id] = row.bear_id
  }

  const shapedRounds = rounds.map((round) => {
    const matchups = matchupsForRound(round.id).map((matchup) => {
      const counts = tallies.get(matchup.id) ?? {}
      const votesA = counts[matchup.bear_a] ?? 0
      const votesB = counts[matchup.bear_b] ?? 0

      return {
        id: matchup.id,
        slot: matchup.slot,
        isBye: matchup.is_bye === 1,
        bearA: matchup.bear_a,
        bearB: matchup.bear_b,
        winner: matchup.winner,
        decidedBy: matchup.decided_by,
        // A closed matchup with no winner is a tie waiting on the host.
        tied: round.status === 'closed' && !matchup.winner && matchup.is_bye === 0,
        votes: { [matchup.bear_a]: votesA, [matchup.bear_b]: votesB },
        totalVotes: votesA + votesB,
      }
    })

    return {
      id: round.id,
      index: round.idx,
      name: round.name,
      tagline: round.tagline,
      status: round.status,
      matchups,
    }
  })

  const aliveCount = bears.filter((bear) => bear.eliminated_round === null).length

  // roundsRemaining() counts the round the surviving bears still have to play,
  // which is the one already on the board -- so only the rounds *before* it get
  // added, or an 11-bear bracket reports five rounds instead of four.
  const totalRounds =
    championId || rounds.length === 0
      ? rounds.length
      : rounds.length - 1 + roundsRemaining(aliveCount)

  return {
    tournament: {
      status: championId ? 'complete' : rounds.length ? 'running' : 'setup',
      championBearId: championId,
      championRevealed,
      totalRounds,
      bearsRemaining: aliveCount,
    },
    bears: bears.map((bear) => ({
      id: bear.id,
      number: bear.number,
      name: bear.name,
      displayName: bear.display_name,
      title: bear.title,
      bio: bear.bio,
      color: bear.color,
      accent: bear.accent,
      seed: bear.seed,
      photoUrl: bear.photo_url,
      photoFocus: bear.photo_focus,
      eliminatedRound: bear.eliminated_round,
    })),
    rounds: shapedRounds,
    currentRoundId: active ? active.id : null,
    turnout: active ? roundTurnout(active.id) : null,
    guestCount: guestCount(),
    myVotes,
    serverTime: new Date().toISOString(),
  }
}

/* -------------------------------------------------------------- mutations */

function insertRound(index, bearsInRound) {
  const meta = roundMeta(bearsInRound.length)
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO rounds (idx, name, tagline, status)
       VALUES (?, ?, ?, 'pending')`
    )
    .run(index, meta.name, meta.tagline)

  const roundId = Number(lastInsertRowid)
  const { bye, pairs } = pairBySeed(bearsInRound)
  const insertMatchup = db.prepare(
    `INSERT INTO matchups (round_id, slot, bear_a, bear_b, is_bye, winner, decided_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  let slot = 0

  // Byes resolve immediately -- nothing to vote on.
  if (bye) {
    insertMatchup.run(roundId, slot, bye.id, null, 1, bye.id, 'bye')
    slot += 1
  }

  for (const [a, b] of pairs) {
    insertMatchup.run(roundId, slot, a.id, b.id, 0, null, null)
    slot += 1
  }

  return roundId
}

/** Create round 1 from the full field. Idempotent-ish: refuses if rounds exist. */
export const startTournament = db.transaction(() => {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM rounds').get().n
  if (existing > 0) {
    throw new TournamentError('The bracket has already started. Reset it first.')
  }

  const field = db.prepare('SELECT id, seed FROM bears ORDER BY seed').all()
  if (field.length < 2) {
    throw new TournamentError('Need at least two bears to run a bracket.', 500)
  }

  insertRound(0, field)
})

export const openRound = db.transaction(() => {
  const round = currentRound()
  if (!round) throw new TournamentError('No round to open -- start the bracket first.')
  if (round.status === 'open') throw new TournamentError('Voting is already open.')
  if (round.status === 'closed') throw new TournamentError('That round is already finished.')

  db.prepare("UPDATE rounds SET status = 'open' WHERE id = ?").run(round.id)
  return round.id
})

/**
 * Close voting, decide every contested matchup, then advance if nothing is
 * tied. Ties stay open for the host to resolve, and advancing happens
 * automatically once the last one is settled.
 */
export const closeRound = db.transaction(() => {
  const round = currentRound()
  if (!round) throw new TournamentError('There is no round in progress.')
  if (round.status !== 'open') {
    throw new TournamentError('Voting is not open for this round.')
  }

  const tallies = tallyByMatchup()
  const setWinner = db.prepare(
    'UPDATE matchups SET winner = ?, decided_by = ? WHERE id = ?'
  )

  for (const matchup of matchupsForRound(round.id)) {
    if (matchup.is_bye === 1) continue

    const { winner } = decideMatchup(
      { bearA: matchup.bear_a, bearB: matchup.bear_b },
      tallies.get(matchup.id) ?? {}
    )
    if (winner) setWinner.run(winner, 'votes', matchup.id)
  }

  db.prepare("UPDATE rounds SET status = 'closed' WHERE id = ?").run(round.id)

  return { roundId: round.id, ...tryAdvance(round.id) }
})

/** Host settles a tie, either by picking a bear or flipping a coin. */
export const decideTie = db.transaction((matchupId, bearId) => {
  const matchup = db.prepare('SELECT * FROM matchups WHERE id = ?').get(matchupId)
  if (!matchup) throw new TournamentError('No such matchup.', 404)
  if (matchup.is_bye === 1) throw new TournamentError('Byes decide themselves.')
  if (matchup.winner) throw new TournamentError('That matchup already has a winner.')

  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(matchup.round_id)
  if (round.status !== 'closed') {
    throw new TournamentError('Close voting on the round before settling ties.')
  }

  let winner = bearId
  let decidedBy = 'host'

  if (!winner || winner === 'random') {
    winner = Math.random() < 0.5 ? matchup.bear_a : matchup.bear_b
    decidedBy = 'coinflip'
  }

  if (winner !== matchup.bear_a && winner !== matchup.bear_b) {
    throw new TournamentError('That bear is not in this matchup.')
  }

  db.prepare('UPDATE matchups SET winner = ?, decided_by = ? WHERE id = ?').run(
    winner,
    decidedBy,
    matchupId
  )

  return { winner, decidedBy, ...tryAdvance(matchup.round_id) }
})

/**
 * If every matchup in the round has a winner, eliminate the losers and either
 * build the next round or crown the champion.
 */
function tryAdvance(roundId) {
  const matchups = matchupsForRound(roundId)
  const unresolved = matchups.filter((matchup) => !matchup.winner)

  if (unresolved.length > 0) {
    return { advanced: false, pendingTies: unresolved.map((m) => m.id) }
  }

  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId)
  const winners = matchups.map((matchup) => matchup.winner)

  // Everyone who played this round and is not a winner goes into early hibernation.
  const eliminate = db.prepare(
    'UPDATE bears SET eliminated_round = ? WHERE id = ? AND eliminated_round IS NULL'
  )
  for (const matchup of matchups) {
    for (const bearId of [matchup.bear_a, matchup.bear_b]) {
      if (bearId && bearId !== matchup.winner) eliminate.run(round.idx, bearId)
    }
  }

  if (winners.length === 1) {
    setMeta(CHAMPION_KEY, winners[0])
    setMeta(REVEALED_KEY, '0')
    return { advanced: true, championBearId: winners[0], nextRoundId: null }
  }

  const advancing = winners.map((id) => ({
    id,
    seed: db.prepare('SELECT seed FROM bears WHERE id = ?').get(id).seed,
  }))

  const nextRoundId = insertRound(round.idx + 1, advancing)
  return { advanced: true, championBearId: null, nextRoundId }
}

export function revealChampion() {
  if (!getMeta(CHAMPION_KEY)) {
    throw new TournamentError('Nobody has won yet. Finish the bracket first.')
  }
  setMeta(REVEALED_KEY, '1')
}

export function hideChampion() {
  setMeta(REVEALED_KEY, '0')
}

/** Wipe the bracket back to the starting field. Guests are kept by default. */
export const resetTournament = db.transaction(({ keepGuests = true } = {}) => {
  db.prepare('DELETE FROM votes').run()
  db.prepare('DELETE FROM matchups').run()
  db.prepare('DELETE FROM rounds').run()
  db.prepare('UPDATE bears SET eliminated_round = NULL').run()
  deleteMeta(CHAMPION_KEY)
  deleteMeta(REVEALED_KEY)

  if (!keepGuests) db.prepare('DELETE FROM guests').run()

  const field = db.prepare('SELECT id, seed FROM bears ORDER BY seed').all()
  insertRound(0, field)
})

/* ----------------------------------------------------------------- voting */

export const castVote = db.transaction((guestId, matchupId, bearId) => {
  const matchup = db.prepare('SELECT * FROM matchups WHERE id = ?').get(matchupId)
  if (!matchup) throw new TournamentError('No such matchup.', 404)
  if (matchup.is_bye === 1) {
    throw new TournamentError('That bear got a free pass. Nothing to vote on.')
  }

  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(matchup.round_id)
  if (round.status !== 'open') {
    throw new TournamentError('Voting is closed for this round.', 409)
  }

  if (bearId !== matchup.bear_a && bearId !== matchup.bear_b) {
    throw new TournamentError('That bear is not in this matchup.')
  }

  const existing = db
    .prepare('SELECT bear_id FROM votes WHERE matchup_id = ? AND guest_id = ?')
    .get(matchupId, guestId)

  if (existing) {
    throw new TournamentError('You already voted in this matchup.', 409)
  }

  db.prepare(
    `INSERT INTO votes (matchup_id, guest_id, bear_id, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(matchupId, guestId, bearId, new Date().toISOString())
})

/** Called once at boot so the host never stares at an empty admin screen. */
export function ensureBracketExists() {
  const rounds = db.prepare('SELECT COUNT(*) AS n FROM rounds').get().n
  if (rounds === 0) startTournament()
}
