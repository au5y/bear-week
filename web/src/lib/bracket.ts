import type { Bear, Matchup, Round, Snapshot } from '../types'

export function bearMap(snapshot: Snapshot): Map<string, Bear> {
  return new Map(snapshot.bears.map((bear) => [bear.id, bear]))
}

/** Mirrors roundMeta() on the server, for rounds that do not exist yet. */
export function roundNameFor(remaining: number): string {
  if (remaining <= 2) return 'The Fat Bear Finals'
  if (remaining <= 4) return 'The Semi-Rounds'
  if (remaining <= 8) return 'The Quarter-Pounders'
  return 'The Round of Chonk'
}

/** How many matchup slots a field of this size needs, counting a bye as one. */
function matchupsFor(bears: number): number {
  return bears % 2 === 1 ? 1 + (bears - 1) / 2 : bears / 2
}

function bearsInRound(round: Round): number {
  return round.matchups.reduce((total, matchup) => total + (matchup.isBye ? 1 : 2), 0)
}

/**
 * Rounds the bracket will still need, so the TV can show the whole shape of the
 * tournament from the first minute instead of one lonely column.
 */
export function projectedRounds(
  snapshot: Snapshot
): Array<{ key: string; name: string; matchupCount: number }> {
  if (snapshot.tournament.championBearId) return []

  const last = snapshot.rounds[snapshot.rounds.length - 1]
  if (!last) return []

  const future: Array<{ key: string; name: string; matchupCount: number }> = []
  let remaining = bearsInRound(last)
  let next = Math.ceil(remaining / 2)
  let guard = 0

  while (next > 1 && guard < 12) {
    future.push({
      key: `future-${next}`,
      name: roundNameFor(next),
      matchupCount: matchupsFor(next),
    })
    remaining = next
    next = Math.ceil(remaining / 2)
    guard += 1
  }

  return future
}

export function currentRound(snapshot: Snapshot): Round | null {
  return snapshot.rounds.find((round) => round.id === snapshot.currentRoundId) ?? null
}

/** Contested matchups only -- byes are not something a guest votes on. */
export function votableMatchups(round: Round | null): Matchup[] {
  return round ? round.matchups.filter((matchup) => !matchup.isBye) : []
}

/** Percentage split for the vote bars. An empty matchup shows 50/50. */
export function votePercent(matchup: Matchup): { a: number; b: number } {
  const a = matchup.votes[matchup.bearA] ?? 0
  const b = matchup.bearB ? matchup.votes[matchup.bearB] ?? 0 : 0
  const total = a + b

  if (total === 0) return { a: 50, b: 50 }
  return { a: (a / total) * 100, b: (b / total) * 100 }
}

export function voteCount(matchup: Matchup, bearId: string | null): number {
  if (!bearId) return 0
  return matchup.votes[bearId] ?? 0
}

/** Playful line for how a matchup was settled. */
export function decisionBlurb(matchup: Matchup): string {
  switch (matchup.decidedBy) {
    case 'bye':
      return 'Free pass. Chunky privileges.'
    case 'coinflip':
      return 'Settled by coin flip. The room demanded it.'
    case 'host':
      return 'Host broke the tie. Take it up with management.'
    case 'votes':
      return `${matchup.totalVotes} ${matchup.totalVotes === 1 ? 'vote' : 'votes'} cast`
    default:
      return ''
  }
}

/* Kept short on purpose: these sit in a narrow bracket cell that truncates,
   and a joke cut off mid-word is not a joke. */
const ELIMINATION_LINES = [
  'Hibernating early',
  'Tapped out, still round',
  'Off to nap on it',
  'Denning up early',
  'Bed. No hard feelings',
]

/** Stable per-bear so the TV does not reshuffle the joke every two seconds. */
export function eliminationLine(bear: Bear): string {
  const index = bear.seed % ELIMINATION_LINES.length
  return ELIMINATION_LINES[index] ?? ELIMINATION_LINES[0]!
}
