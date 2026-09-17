import express from 'express'
import cors from 'cors'

import { env } from './env.js'
import { ensureBracketExists, startDeadlineWatcher } from './tournament.js'
import { attachGuest, errorHandler } from './middleware.js'
import { publicRouter } from './routes/public.js'
import { adminRouter } from './routes/admin.js'

const app = express()

// Off by default: X-Forwarded-For is client-supplied, so trusting it without a
// real proxy in front hands anyone a free rate-limiter bypass. Set
// TRUST_PROXY=1 only when a tunnel or reverse proxy you control sets the header.
app.set('trust proxy', env.trustProxy)
app.disable('x-powered-by')

app.use(
  cors({
    origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
    credentials: false,
  })
)
app.use(express.json({ limit: '16kb' }))
app.use(attachGuest)

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'fat-bear-week' })
})

app.use('/api', publicRouter)
app.use('/api/admin', adminRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'No bears down this path.' })
})

app.use(errorHandler)

ensureBracketExists()
startDeadlineWatcher()

const server = app.listen(env.port, env.host, () => {
  console.log(`\n  Fat Bear Week backend listening on http://${env.host}:${env.port}`)
  console.log(`  Database: ${env.databasePath}`)
  console.log(`  Party PIN: ${env.partyPin ? 'required' : 'not required'}`)
  console.log(`  CORS origins: ${env.corsOrigins.join(', ')}`)
  console.log(`  Trust proxy: ${env.trustProxy ? 'yes (X-Forwarded-For honoured)' : 'no'}\n`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}
