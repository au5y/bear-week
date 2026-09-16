/**
 * All configuration comes from the environment so the same image runs on a
 * laptop, a homelab box, or a cloud VM without code changes.
 */

function optional(name, fallback) {
  const raw = process.env[name]
  return raw === undefined || raw === '' ? fallback : raw
}

function list(name, fallback) {
  return optional(name, fallback)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const ADMIN_TOKEN = optional('ADMIN_TOKEN', '')

if (!ADMIN_TOKEN) {
  console.error(
    '\nADMIN_TOKEN is not set. The host screen would be wide open, so refusing to start.\n' +
      'Pick anything memorable and pass it in, e.g. ADMIN_TOKEN=honeypaws npm start\n'
  )
  process.exit(1)
}

if (ADMIN_TOKEN.length < 6) {
  console.error('\nADMIN_TOKEN must be at least 6 characters.\n')
  process.exit(1)
}

export const env = {
  port: Number(optional('PORT', '8080')),
  host: optional('HOST', '0.0.0.0'),
  adminToken: ADMIN_TOKEN,
  /** Party PIN is optional. Empty string means anyone with the link can join. */
  partyPin: optional('PARTY_PIN', ''),
  databasePath: optional('DATABASE_PATH', './data/bears.sqlite'),
  /** '*' allows any origin, which is fine for a one-night party app. */
  corsOrigins: list('CORS_ORIGINS', '*'),
  /** Shown on the TV screen under the QR code, and encoded into the QR itself. */
  voteUrl: optional('VOTE_URL', ''),
  isProduction: optional('NODE_ENV', 'development') === 'production',
}
