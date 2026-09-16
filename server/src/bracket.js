/**
 * Pure bracket logic. No database, no Express -- so it can be unit tested and
 * reasoned about on its own. See test/bracket.test.js.
 */

/**
 * Pair up an arbitrary number of bears for one round.
 *
 * Standard single-elimination seeding: best seed plays worst seed, second-best
 * plays second-worst, and so on. If the field is odd, the top remaining seed
 * gets a bye and advances for free (chunky privileges).
 *
 * @param {Array<{id: string, seed: number}>} contenders
 * @returns {{bye: {id: string, seed: number}|null, pairs: Array<[object, object]>}}
 */
export function pairBySeed(contenders) {
  const sorted = [...contenders].sort((a, b) => a.seed - b.seed)

  let bye = null
  let pool = sorted

  if (pool.length % 2 === 1) {
    bye = pool[0]
    pool = pool.slice(1)
  }

  const pairs = []
  for (let i = 0; i < pool.length / 2; i += 1) {
    pairs.push([pool[i], pool[pool.length - 1 - i]])
  }

  return { bye, pairs }
}

/**
 * Round title and tagline, chosen by how many bears are still standing.
 * @param {number} remaining
 */
export function roundMeta(remaining) {
  if (remaining <= 2) {
    return {
      name: 'The Fat Bear Finals',
      tagline: 'Two units enter. One leaves rounder.',
    }
  }
  if (remaining <= 4) {
    return {
      name: 'The Semi-Rounds',
      tagline: 'Things are getting seriously spherical.',
    }
  }
  if (remaining <= 8) {
    return {
      name: 'The Quarter-Pounders',
      tagline: 'Quarter pounders. Full-size bears.',
    }
  }
  return {
    name: 'The Round of Chonk',
    tagline: 'Everybody in. Nobody skips dessert.',
  }
}

/**
 * Decide a matchup from its vote tallies.
 *
 * A tie (including nobody voting at all) intentionally returns no winner --
 * the host resolves it from the admin screen with a pick or a coin flip.
 *
 * @param {{bearA: string, bearB: string}} matchup
 * @param {{[bearId: string]: number}} tallies
 * @returns {{winner: string|null, tie: boolean}}
 */
export function decideMatchup(matchup, tallies) {
  const a = tallies[matchup.bearA] ?? 0
  const b = tallies[matchup.bearB] ?? 0

  if (a === b) return { winner: null, tie: true }
  return { winner: a > b ? matchup.bearA : matchup.bearB, tie: false }
}

/**
 * How many rounds a field of this size still needs, byes included.
 * 11 bears -> 4 rounds. Used only for display ("Round 2 of 4").
 * @param {number} fieldSize
 */
export function roundsRemaining(fieldSize) {
  let bears = fieldSize
  let rounds = 0
  while (bears > 1) {
    bears = Math.ceil(bears / 2)
    rounds += 1
  }
  return rounds
}
