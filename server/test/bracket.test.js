import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  pairBySeed,
  roundMeta,
  decideMatchup,
  roundsRemaining,
} from '../src/bracket.js'

const field = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: `bear-${i + 1}`, seed: i + 1 }))

test('an even field is paired best-vs-worst with no bye', () => {
  const { bye, pairs } = pairBySeed(field(6))

  assert.equal(bye, null)
  assert.deepEqual(
    pairs.map(([a, b]) => [a.seed, b.seed]),
    [
      [1, 6],
      [2, 5],
      [3, 4],
    ]
  )
})

test('an odd field gives the top seed a bye', () => {
  const { bye, pairs } = pairBySeed(field(11))

  assert.equal(bye.seed, 1)
  assert.deepEqual(
    pairs.map(([a, b]) => [a.seed, b.seed]),
    [
      [2, 11],
      [3, 10],
      [4, 9],
      [5, 8],
      [6, 7],
    ]
  )
})

test('three bears means one bye and one matchup', () => {
  const { bye, pairs } = pairBySeed([
    { id: 'c', seed: 9 },
    { id: 'a', seed: 2 },
    { id: 'b', seed: 5 },
  ])

  assert.equal(bye.seed, 2)
  assert.deepEqual(
    pairs.map(([a, b]) => [a.seed, b.seed]),
    [[5, 9]]
  )
})

test('input order does not matter, only seeds', () => {
  const shuffled = [...field(6)].reverse()
  assert.deepEqual(pairBySeed(shuffled), pairBySeed(field(6)))
})

test('the 11-bear bracket runs exactly four rounds', () => {
  assert.equal(roundsRemaining(11), 4)

  // Walk the whole tournament to be sure byes do not strand anyone.
  let remaining = field(11)
  const sizes = []
  let guard = 0

  while (remaining.length > 1 && guard < 20) {
    sizes.push(remaining.length)
    const { bye, pairs } = pairBySeed(remaining)
    const advancing = pairs.map(([a]) => a) // top seed wins every matchup
    remaining = bye ? [bye, ...advancing] : advancing
    guard += 1
  }

  assert.deepEqual(sizes, [11, 6, 3, 2])
  assert.equal(remaining.length, 1)
  assert.equal(remaining[0].seed, 1)
})

test('round names follow the shrinking field', () => {
  assert.equal(roundMeta(11).name, 'The Round of Chonk')
  assert.equal(roundMeta(6).name, 'The Quarter-Pounders')
  assert.equal(roundMeta(3).name, 'The Semi-Rounds')
  assert.equal(roundMeta(2).name, 'The Fat Bear Finals')
})

test('the bear with more votes wins', () => {
  const matchup = { bearA: 'chunk', bearB: 'grazer' }

  assert.deepEqual(decideMatchup(matchup, { chunk: 7, grazer: 3 }), {
    winner: 'chunk',
    tie: false,
  })
  assert.deepEqual(decideMatchup(matchup, { chunk: 1, grazer: 4 }), {
    winner: 'grazer',
    tie: false,
  })
})

test('ties and empty matchups are left for the host to settle', () => {
  const matchup = { bearA: 'chunk', bearB: 'grazer' }

  assert.deepEqual(decideMatchup(matchup, { chunk: 5, grazer: 5 }), {
    winner: null,
    tie: true,
  })
  assert.deepEqual(decideMatchup(matchup, {}), { winner: null, tie: true })
})
