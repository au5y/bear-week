import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { env } from './env.js'
import { BEARS, displayName } from './bears.js'

const dbPath = resolve(env.databasePath)
mkdirSync(dirname(dbPath), { recursive: true })

export const db = new Database(dbPath)

// WAL keeps reads (a room full of phones polling) from blocking writes (votes).
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS bears (
    id                TEXT PRIMARY KEY,
    number            TEXT NOT NULL,
    name              TEXT,
    display_name      TEXT NOT NULL,
    title             TEXT NOT NULL,
    bio               TEXT NOT NULL,
    color             TEXT NOT NULL,
    accent            TEXT NOT NULL,
    seed              INTEGER NOT NULL,
    photo_url         TEXT,
    photo_focus       TEXT,
    verified          INTEGER NOT NULL DEFAULT 0,
    eliminated_round  INTEGER
  );

  CREATE TABLE IF NOT EXISTS guests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    name_key    TEXT NOT NULL UNIQUE,
    pin_hash    TEXT,
    token       TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    idx      INTEGER NOT NULL UNIQUE,
    name     TEXT NOT NULL,
    tagline  TEXT NOT NULL,
    status   TEXT NOT NULL CHECK (status IN ('pending', 'open', 'closed'))
  );

  CREATE TABLE IF NOT EXISTS matchups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id    INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    slot        INTEGER NOT NULL,
    bear_a      TEXT REFERENCES bears(id),
    bear_b      TEXT REFERENCES bears(id),
    is_bye      INTEGER NOT NULL DEFAULT 0,
    winner      TEXT REFERENCES bears(id),
    decided_by  TEXT
  );

  CREATE TABLE IF NOT EXISTS votes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    matchup_id  INTEGER NOT NULL REFERENCES matchups(id) ON DELETE CASCADE,
    guest_id    INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    bear_id     TEXT NOT NULL REFERENCES bears(id),
    created_at  TEXT NOT NULL,
    UNIQUE (matchup_id, guest_id)
  );

  CREATE TABLE IF NOT EXISTS meta (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_matchups_round ON matchups (round_id);
  CREATE INDEX IF NOT EXISTS idx_votes_matchup ON votes (matchup_id);
  CREATE INDEX IF NOT EXISTS idx_votes_guest ON votes (guest_id);
`)

/** Add a column to an existing database without losing its data. */
function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some((info) => info.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

addColumnIfMissing('bears', 'photo_focus', 'TEXT')

/**
 * Sync the contestant field from bears.js on every boot.
 *
 * bears.js is the source of truth for how a bear *presents* -- photo, bio,
 * title, colours, seed -- so editing it (adding real photos, rewriting the
 * unverified bios) takes effect on restart. An insert-only seed would silently
 * ignore those edits once the database existed, which is exactly the trap you
 * hit the night of the party.
 *
 * Bracket state (eliminated_round, and the rounds/matchups/votes tables) is
 * deliberately NOT touched here, so a restart mid-party never resurrects a bear.
 */
function syncBears() {
  const upsert = db.prepare(`
    INSERT INTO bears
      (id, number, name, display_name, title, bio, color, accent, seed,
       photo_url, photo_focus, verified)
    VALUES
      (@id, @number, @name, @displayName, @title, @bio, @color, @accent, @seed,
       @photoUrl, @photoFocus, @verified)
    ON CONFLICT (id) DO UPDATE SET
      number       = excluded.number,
      name         = excluded.name,
      display_name = excluded.display_name,
      title        = excluded.title,
      bio          = excluded.bio,
      color        = excluded.color,
      accent       = excluded.accent,
      seed         = excluded.seed,
      photo_url    = excluded.photo_url,
      photo_focus  = excluded.photo_focus,
      verified     = excluded.verified
  `)

  const syncAll = db.transaction((bears) => {
    for (const bear of bears) {
      upsert.run({
        id: bear.id,
        number: bear.number,
        name: bear.name ?? null,
        displayName: displayName(bear),
        title: bear.title,
        bio: bear.bio,
        color: bear.color,
        accent: bear.accent,
        seed: bear.seed,
        photoUrl: bear.photoUrl ?? null,
        photoFocus: bear.photoFocus ?? null,
        verified: bear.verified ? 1 : 0,
      })
    }
  })

  syncAll(BEARS)
}

syncBears()

export function getMeta(key, fallback = null) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key)
  return row ? row.value : fallback
}

export function setMeta(key, value) {
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value))
}

export function deleteMeta(key) {
  db.prepare('DELETE FROM meta WHERE key = ?').run(key)
}
