/**
 * Tournament service: everything that reads or mutates bracket state.
 * Routes stay thin and just call into here.
 */

import { db, getMeta, setMeta, deleteMeta } from './db.js'
import { pairBySeed, roundMeta, decideMatchup, roundsRemaining } from './bracket.js'

const CHAMPION_KEY = 'champion_bear'
const REVEALED_KEY = 'champion_revealed'
/** ISO timestamp the host has counted down to, or absent when no break is running. */
const INTERMISSION_KEY = 'intermission_until'
/** ISO timestamp voting on the open round closes itself at. */
const ROUND_CLOSES_KEY = 'round_closes_at'

/** Keeps a fat-fingered "+9999 minutes" from parking the TV on the break screen. */
const MAX_INTERMISSION_MINUTES = 120

class TournamentError extends Error {
  /**
   * @param {string} message shown to the guest as-is
   * @param {number} status HTTP status
   * @param {string|null} code stable identifier for clients that need to branch
   *   on *which* failure this is, so the UI never has to match on English copy.
   */
  constructor(message, status = 400, code = null) {
    super(message)
    this.status = status
    this.code = code
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
 * Standings across every matchup that has already been decided.
 *
 * A judge scores a point for each decided matchup they picked the winner of.
 * Only matchups in *closed* rounds count, so an open round cannot leak which
 * way it is leaning: the live tallies are public anyway, but a score that
 * moved with every vote would let the room reverse-engineer a ballot.
 *
 * Ties in points share a rank (1, 2, 2, 4), and judges who have not voted in
 * anything decided yet are left off rather than padding the board with zeroes.
 *
 * @returns {{scoredMatchups: number, entries: Array<object>}}
 */
function standings() {
  const scored = db
    .prepare(
      `SELECT COUNT(*) AS n
         FROM matchups m
         JOIN rounds r ON r.id = m.round_id
        WHERE r.status = 'closed' AND m.is_bye = 0 AND m.winner IS NOT NULL`
    )
    .get().n

  if (scored === 0) return { scoredMatchups: 0, entries: [] }

  const rows = db
    .prepare(
      `WITH decided AS (
         SELECT m.id, m.winner
           FROM matchups m
           JOIN rounds r ON r.id = m.round_id
          WHERE r.status = 'closed' AND m.is_bye = 0 AND m.winner IS NOT NULL
       )
       SELECT g.id   AS id,
              g.name AS name,
              COUNT(d.id) AS voted,
              COALESCE(SUM(CASE WHEN v.bear_id = d.winner THEN 1 ELSE 0 END), 0) AS correct
         FROM guests g
         JOIN votes v   ON v.guest_id = g.id
         JOIN decided d ON d.id = v.matchup_id
        GROUP BY g.id
        ORDER BY correct DESC, voted DESC, g.name COLLATE NOCASE`
    )
    .all()

  let rank = 0
  let previous = null
  const entries = rows.map((row, index) => {
    if (previous === null || row.correct !== previous) {
      rank = index + 1
      previous = row.correct
    }
    return {
      guestId: row.id,
      name: row.name,
      correct: row.correct,
      voted: row.voted,
      rank,
      /** True when more than one judge sits on this rank. */
      shared: false,
    }
  })

  for (const entry of entries) {
    entry.shared = entries.filter((other) => other.rank === entry.rank).length > 1
  }

  return { scoredMatchups: scored, entries }
}

/**
 * The single payload every screen polls. One request, whole world.
 * @param {{id: number}|null} guest
 */
export function snapshot(guest = null) {
  const bears = allBears()
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

      // A bye has no bear_b, so only key the bears that actually exist --
      // otherwise the payload carries a literal "null" entry.
      const votes = { [matchup.bear_a]: votesA }
      if (matchup.bear_b) votes[matchup.bear_b] = votesB

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
        votes,
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
  const board = standings()

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
      cardUrl: bear.card_url,
      profileUrl: bear.profile_url,
      videoUrl: bear.video_url,
      eliminatedRound: bear.eliminated_round,
    })),
    rounds: shapedRounds,
    /**
     * When the host has called a break, every screen counts down to this. Left
     * as an absolute timestamp rather than "seconds remaining" so a phone that
     * polls late still lands on the right number; `serverTime` below lets a
     * client correct for a clock that disagrees.
     */
    intermissionUntil: getMeta(INTERMISSION_KEY),
    /** When set, voting on the open round closes itself at this timestamp. */
    roundClosesAt: getMeta(ROUND_CLOSES_KEY),
    currentRoundId: active ? active.id : null,
    /** Judge standings, and how many matchups they are scored out of. */
    leaderboard: board.entries,
    scoredMatchups: board.scoredMatchups,
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
  deleteMeta(INTERMISSION_KEY)
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
  deleteMeta(ROUND_CLOSES_KEY)

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

  const seedOf = db.prepare('SELECT seed FROM bears WHERE id = ?')
  const advancing = winners.map((id) => ({ id, seed: seedOf.get(id).seed }))

  const nextRoundId = insertRound(round.idx + 1, advancing)
  return { advanced: true, championBearId: null, nextRoundId }
}

/**
 * Put a clock on the open round. When it runs out the round closes itself --
 * see startDeadlineWatcher() -- so the host can set it and go get a drink.
 * @param {number} minutes
 */
export function setRoundDeadline(minutes) {
  const round = currentRound()
  if (!round || round.status !== 'open') {
    throw new TournamentError('Open a round before putting a clock on it.')
  }

  const requested = Number(minutes)
  if (!Number.isFinite(requested) || requested <= 0) {
    throw new TournamentError('How long is the round? Send minutes above zero.')
  }
  if (requested > MAX_INTERMISSION_MINUTES) {
    throw new TournamentError(
      `${MAX_INTERMISSION_MINUTES} minutes is the limit for one round.`
    )
  }

  const at = new Date(Date.now() + requested * 60_000).toISOString()
  setMeta(ROUND_CLOSES_KEY, at)
  return { roundClosesAt: at }
}

/** Voting stays open until the host says otherwise. */
export function clearRoundDeadline() {
  deleteMeta(ROUND_CLOSES_KEY)
}

/**
 * Close the round when its clock runs out.
 *
 * The deadline lives in the database rather than in a timer's closure, so a
 * server restart mid-round picks the same deadline back up instead of leaving
 * voting open forever. Ticking once a second is plenty for a party, and costs
 * one indexed lookup.
 *
 * @returns {() => void} stop the watcher (used by tests)
 */
export function startDeadlineWatcher({ intervalMs = 1000 } = {}) {
  const tick = () => {
    const deadline = getMeta(ROUND_CLOSES_KEY)
    if (!deadline) return

    const at = Date.parse(deadline)
    if (Number.isNaN(at)) {
      deleteMeta(ROUND_CLOSES_KEY)
      return
    }
    if (at > Date.now()) return

    try {
      const result = closeRound()
      console.log(`  Round clock ran out -- closed round ${result.roundId}.`)
    } catch (err) {
      // Nothing to close (host beat the clock to it). Drop the stale deadline
      // rather than retrying every second for the rest of the night.
      deleteMeta(ROUND_CLOSES_KEY)
      if (!(err instanceof TournamentError)) throw err
    }
  }

  const timer = setInterval(tick, intervalMs)
  timer.unref()
  return () => clearInterval(timer)
}

/**
 * Start (or extend) the between-rounds break the TV counts down to.
 * @param {number} minutes
 */
export function startIntermission(minutes) {
  const requested = Number(minutes)
  if (!Number.isFinite(requested) || requested <= 0) {
    throw new TournamentError('How long is the break? Send minutes above zero.')
  }
  if (requested > MAX_INTERMISSION_MINUTES) {
    throw new TournamentError(
      `That is a long snack break. ${MAX_INTERMISSION_MINUTES} minutes is the limit.`
    )
  }

  const until = new Date(Date.now() + requested * 60_000).toISOString()
  setMeta(INTERMISSION_KEY, until)
  return { intermissionUntil: until }
}

/** Back to the bracket, whether or not the clock ran out. */
export function endIntermission() {
  deleteMeta(INTERMISSION_KEY)
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
  deleteMeta(INTERMISSION_KEY)
  deleteMeta(ROUND_CLOSES_KEY)

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

  // Changing your mind is allowed right up until the round closes -- people
  // misread a bear, or their thumb finds the wrong card. The tally is a live
  // count of current picks, so an updated row is all it takes.
  if (existing) {
    if (existing.bear_id === bearId) return { created: false, changed: false, bearId }

    db.prepare(
      'UPDATE votes SET bear_id = ?, created_at = ? WHERE matchup_id = ? AND guest_id = ?'
    ).run(bearId, new Date().toISOString(), matchupId, guestId)

    return { created: false, changed: true, previousBearId: existing.bear_id, bearId }
  }

  db.prepare(
    `INSERT INTO votes (matchup_id, guest_id, bear_id, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(matchupId, guestId, bearId, new Date().toISOString())

  return { created: true, changed: false, bearId }
})

/** Called once at boot so the host never stares at an empty admin screen. */
export function ensureBracketExists() {
  const rounds = db.prepare('SELECT COUNT(*) AS n FROM rounds').get().n
  if (rounds === 0) startTournament()
}
