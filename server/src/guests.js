/**
 * Guest accounts. A guest is a display name plus an optional self-chosen PIN.
 *
 * - No PIN: the name is open, and anyone who types it gets that ballot back.
 *   Fine for "Aunt Karen" at a house party.
 * - With a PIN: the name is claimed, and rejoining it requires the PIN. Stops
 *   a friend from hijacking your ballot as a bit.
 *
 * Joining hands back an opaque token which the phone keeps in localStorage, so
 * a refresh does not cost anyone their votes.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

import { db } from './db.js'
import { TournamentError } from './tournament.js'

const MAX_NAME_LENGTH = 24

function hashPin(pin) {
  const salt = randomBytes(16)
  const derived = scryptSync(pin, salt, 32)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

function pinMatches(pin, stored) {
  const [saltHex, expectedHex] = stored.split(':')
  const derived = scryptSync(pin, Buffer.from(saltHex, 'hex'), 32)
  const expected = Buffer.from(expectedHex, 'hex')
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

/** Collapse whitespace and case so "Bear Fan" and "bear  fan" are one guest. */
function nameKey(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function publicGuest(guest) {
  return {
    id: guest.id,
    name: guest.name,
    hasPin: Boolean(guest.pin_hash),
  }
}

export function findGuestByToken(token) {
  if (!token) return null
  return db.prepare('SELECT * FROM guests WHERE token = ?').get(token) ?? null
}

/**
 * Join or rejoin. Returns { guest, token, returning }.
 * @param {string} rawName
 * @param {string} rawPin empty string means "no PIN"
 */
export function joinParty(rawName, rawPin) {
  const name = String(rawName ?? '').trim().replace(/\s+/g, ' ')
  const pin = String(rawPin ?? '').trim()

  if (name.length < 2) {
    throw new TournamentError('Give us a name with at least two characters.')
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new TournamentError(`Names top out at ${MAX_NAME_LENGTH} characters.`)
  }
  if (pin && !/^\d{4,8}$/.test(pin)) {
    throw new TournamentError('A PIN must be 4 to 8 digits, or leave it blank.')
  }

  const key = nameKey(name)
  const existing = db.prepare('SELECT * FROM guests WHERE name_key = ?').get(key)

  if (existing) {
    if (existing.pin_hash) {
      if (!pin) {
        throw new TournamentError(
          `"${existing.name}" is PIN-protected. Enter the PIN to get your ballot back.`,
          401
        )
      }
      if (!pinMatches(pin, existing.pin_hash)) {
        throw new TournamentError('That PIN does not match. Try again?', 401)
      }
    } else if (pin) {
      // Unprotected name, and they supplied a PIN: let them lock it down now.
      db.prepare('UPDATE guests SET pin_hash = ? WHERE id = ?').run(
        hashPin(pin),
        existing.id
      )
    }

    // Rotate the token so an old device cannot keep voting as this guest.
    const token = randomBytes(24).toString('base64url')
    db.prepare('UPDATE guests SET token = ? WHERE id = ?').run(token, existing.id)

    const refreshed = db.prepare('SELECT * FROM guests WHERE id = ?').get(existing.id)
    return { guest: publicGuest(refreshed), token, returning: true }
  }

  const token = randomBytes(24).toString('base64url')
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO guests (name, name_key, pin_hash, token, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, key, pin ? hashPin(pin) : null, token, new Date().toISOString())

  const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(Number(lastInsertRowid))
  return { guest: publicGuest(guest), token, returning: false }
}

/** Admin roster: who is here, and how many votes each has cast. */
export function guestRoster() {
  return db
    .prepare(
      `SELECT g.id, g.name, g.pin_hash IS NOT NULL AS has_pin, g.created_at,
              (SELECT COUNT(*) FROM votes v WHERE v.guest_id = g.id) AS votes_cast
       FROM guests g
       ORDER BY g.created_at`
    )
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      hasPin: row.has_pin === 1,
      votesCast: row.votes_cast,
      joinedAt: row.created_at,
    }))
}

export function removeGuest(id) {
  const result = db.prepare('DELETE FROM guests WHERE id = ?').run(id)
  if (result.changes === 0) throw new TournamentError('No such guest.', 404)
}

export { publicGuest }
