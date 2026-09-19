import { useCallback, useEffect, useState } from 'react'

import { ApiError, adminToken, api } from '../api'
import { usePoll } from '../hooks/usePoll'
import { formatCountdown, useCountdown } from '../hooks/useCountdown'
import { bearMap, voteCount } from '../lib/bracket'
import type { AdminSnapshot, Bear, Matchup } from '../types'
import { BearAvatar } from '../components/BearAvatar'
import { VoteBar } from '../components/VoteBar'
import { PawPrint } from '../components/PawPrint'
import { CreditFooter } from '../components/Disclosure'
import './AdminScreen.css'

/** Host console. Everything needed to run the party from one phone or laptop. */
export function AdminScreen() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(Boolean(adminToken.get()))

  useEffect(() => {
    if (!adminToken.get()) return
    api.admin
      .ping()
      .then(() => setAuthed(true))
      .catch(() => {
        adminToken.clear()
        setAuthed(false)
      })
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div className="admin admin--gate">
        <p className="admin__gateline">Checking host token…</p>
      </div>
    )
  }

  if (!authed) return <TokenGate onUnlocked={() => setAuthed(true)} />

  return <Console onSignOut={() => {
    adminToken.clear()
    setAuthed(false)
  }} />
}

function TokenGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    adminToken.set(token)

    try {
      await api.admin.ping()
      onUnlocked()
    } catch (err) {
      adminToken.clear()
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin admin--gate">
      <form className="admin__gatecard card" onSubmit={submit}>
        <PawPrint size={48} color="var(--fur)" />
        <h1 className="admin__gatetitle">Host only</h1>
        <p className="admin__gateline">
          This screen starts and stops the voting. Guests should not be in here.
        </p>
        {error && <p className="alert">{error}</p>}
        <label className="field">
          <span className="field__label">Host token</span>
          <input
            className="field__input"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            autoComplete="current-password"
            placeholder="ADMIN_TOKEN"
            required
          />
          <span className="field__hint">
            Whatever you set as <code>ADMIN_TOKEN</code> on the server.
          </span>
        </label>
        <button className="btn btn--wide" type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Unlock the console'}
        </button>
      </form>
    </div>
  )
}

/* ----------------------------------------------------------------- console */

function Console({ onSignOut }: { onSignOut: () => void }) {
  const { data, error, refresh } = usePoll<AdminSnapshot>(
    (signal) => api.admin.state(signal),
    2000
  )

  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const run = useCallback(
    async (label: string, action: () => Promise<unknown>) => {
      setBusy(true)
      setActionError(null)
      setNotice(null)
      try {
        await action()
        setNotice(label)
        refresh()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          onSignOut()
          return
        }
        setActionError((err as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [refresh, onSignOut]
  )

  if (!data) {
    return (
      <div className="admin admin--gate">
        <p className={error ? 'alert' : 'admin__gateline'}>
          {error ?? 'Loading the console…'}
        </p>
      </div>
    )
  }

  const bears = bearMap(data)
  const round = data.rounds.find((item) => item.id === data.currentRoundId) ?? null
  const contested = round ? round.matchups.filter((matchup) => !matchup.isBye) : []
  const ties = contested.filter((matchup) => matchup.tied)
  const complete = data.tournament.status === 'complete'
  const champion = data.tournament.championBearId
    ? bears.get(data.tournament.championBearId)
    : null

  return (
    <div className="admin">
      <header className="admin__header">
        <div>
          <h1 className="admin__title">Host console</h1>
          <p className="admin__sub">
            {complete
              ? 'Bracket finished.'
              : round
                ? `${round.name} · ${round.status}`
                : 'No round yet.'}
          </p>
        </div>
        <button className="btn btn--ghost btn--small" type="button" onClick={onSignOut}>
          Lock
        </button>
      </header>

      {error && <p className="alert alert--quiet">{error}</p>}
      {actionError && <p className="alert">{actionError}</p>}
      {notice && <p className="alert alert--quiet">{notice}</p>}

      {/* ------------------------------------------------ round controls */}
      <section className="panel card">
        <h2 className="panel__title">Round controls</h2>

        <div className="admin__stats">
          <Stat label="Judges" value={String(data.guestCount)} />
          <Stat
            label="Finished this round"
            value={
              data.turnout ? `${data.turnout.finished}/${data.turnout.total}` : '—'
            }
          />
          <Stat label="Bears left" value={String(data.tournament.bearsRemaining)} />
          <Stat
            label="Round"
            value={round ? `${round.index + 1} of ${data.tournament.totalRounds}` : '—'}
          />
        </div>

        {round?.status === 'open' && data.turnout && (
          <p className="admin__hint">
            {data.turnout.finished < data.turnout.total
              ? `${data.turnout.total - data.turnout.finished} judge(s) still voting. You can close anyway.`
              : 'Everyone has voted. Safe to close.'}
          </p>
        )}

        <div className="admin__buttons">
          <button
            className="btn btn--go"
            type="button"
            disabled={busy || complete || !round || round.status !== 'pending'}
            onClick={() => run('Voting is open.', () => api.admin.openRound())}
          >
            Open voting
          </button>

          <button
            className="btn btn--stop"
            type="button"
            disabled={busy || !round || round.status !== 'open'}
            onClick={() =>
              run('Round closed and winners revealed.', () => api.admin.closeRound())
            }
          >
            Close voting &amp; reveal
          </button>
        </div>

        <p className="admin__hint">
          Closing eliminates the losers and builds the next round automatically. A tied
          matchup waits for you below.
        </p>
      </section>

      {/* -------------------------------------------------------- clocks */}
      <ClockPanel data={data} busy={busy} run={run} />

      {/* ---------------------------------------------------- tie-breaks */}
      {ties.length > 0 && (
        <section className="panel panel--warn card">
          <h2 className="panel__title">
            Tie-break needed ({ties.length})
          </h2>
          <p className="admin__hint">
            The bracket cannot advance until every tie is settled. Pick a winner, or let
            the coin decide.
          </p>
          {ties.map((matchup) => (
            <TieBreaker
              key={matchup.id}
              matchup={matchup}
              bears={bears}
              busy={busy}
              onDecide={(bearId, label) =>
                run(label, () => api.admin.decide(matchup.id, bearId))
              }
            />
          ))}
        </section>
      )}

      {/* ------------------------------------------------ live matchups */}
      {round && contested.length > 0 && (
        <section className="panel card">
          <h2 className="panel__title">
            {round.status === 'open' ? 'Live tallies' : 'This round'}
          </h2>
          {contested.map((matchup) => {
            const bearA = bears.get(matchup.bearA)
            const bearB = matchup.bearB ? bears.get(matchup.bearB) : null
            if (!bearA || !bearB) return null

            return (
              <div key={matchup.id} className="tally">
                <div className="tally__names">
                  <span>{bearA.displayName}</span>
                  <span className="tally__vs">vs</span>
                  <span>{bearB.displayName}</span>
                </div>
                <VoteBar matchup={matchup} bearA={bearA} bearB={bearB} />
              </div>
            )
          })}
        </section>
      )}

      {/* -------------------------------------------------- the champion */}
      {champion && (
        <section className="panel panel--gold card">
          <h2 className="panel__title">Champion</h2>
          <div className="admin__champ">
            <BearAvatar bear={champion} size={72} />
            <div>
              <p className="admin__champname">{champion.displayName}</p>
              <p className="admin__hint">
                {data.tournament.championRevealed
                  ? 'Revealed on the big screen right now.'
                  : 'Decided but hidden. Build the suspense, then hit reveal.'}
              </p>
            </div>
          </div>
          <div className="admin__buttons">
            <button
              className="btn btn--go"
              type="button"
              disabled={busy || data.tournament.championRevealed}
              onClick={() =>
                run('Confetti away.', () => api.admin.revealChampion())
              }
            >
              🏆 Reveal champion
            </button>
            <button
              className="btn btn--ghost"
              type="button"
              disabled={busy || !data.tournament.championRevealed}
              onClick={() => run('Reveal hidden again.', () => api.admin.hideChampion())}
            >
              Hide again
            </button>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- guests */}
      <section className="panel card">
        <h2 className="panel__title">Judges ({data.guests.length})</h2>
        {data.guests.length === 0 ? (
          <p className="admin__hint">
            Nobody has joined yet. Point them at the QR code on the TV screen.
          </p>
        ) : (
          <ul className="roster">
            {data.guests.map((entry) => (
              <li key={entry.id} className="roster__row">
                <span className="roster__name">
                  {entry.name}
                  {entry.hasPin && (
                    <span className="roster__lock" title="PIN protected">
                      🔒
                    </span>
                  )}
                </span>
                <span className="roster__votes">
                  {entry.votesCast} {entry.votesCast === 1 ? 'vote' : 'votes'}
                </span>
                <button
                  className="btn btn--ghost btn--small"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(`Remove ${entry.name}? Their votes are deleted too.`)
                    ) {
                      return
                    }
                    run(`${entry.name} removed.`, () => api.admin.removeGuest(entry.id))
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------- danger */}
      <section className="panel panel--danger card">
        <h2 className="panel__title">Start over</h2>
        <p className="admin__hint">
          Wipes every vote and rebuilds the bracket from the whole field. Use it if a
          round goes sideways.
        </p>
        <div className="admin__buttons">
          <button
            className="btn btn--stop"
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm('Reset the bracket? All votes are erased. Judges stay.'))
                return
              run('Bracket reset. Judges kept.', () => api.admin.reset(true))
            }}
          >
            Reset bracket
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                !window.confirm(
                  'Reset everything, including every judge? Guests must rejoin on their phones.'
                )
              ) {
                return
              }
              run('Full reset. Everyone rejoins.', () => api.admin.reset(false))
            }}
          >
            Reset + clear judges
          </button>
        </div>
      </section>

      <CreditFooter />
    </div>
  )
}

const ROUND_MINUTES = [1, 2, 5]
const BREAK_MINUTES = [2, 5, 10]

/**
 * The two clocks the host can put on the room: how long voting stays open, and
 * how long the break before the next round runs. Both are optional -- without
 * them the party runs entirely on button presses, exactly as it did before.
 */
function ClockPanel({
  data,
  busy,
  run,
}: {
  data: AdminSnapshot
  busy: boolean
  run: (label: string, action: () => Promise<unknown>) => void
}) {
  const round = data.rounds.find((item) => item.id === data.currentRoundId) ?? null
  const roundLeft = useCountdown(data.roundClosesAt, data.serverTime)
  const breakLeft = useCountdown(data.intermissionUntil, data.serverTime)
  const votingOpen = round?.status === 'open'

  return (
    <section className="panel card">
      <h2 className="panel__title">Clocks</h2>

      <div className="clock">
        <div className="clock__head">
          <h3 className="clock__name">Voting closes in</h3>
          <span className="clock__value">
            {roundLeft === null ? 'no clock' : formatCountdown(roundLeft)}
          </span>
        </div>
        <p className="admin__hint">
          {votingOpen
            ? 'The round closes itself when this runs out, exactly as if you hit Close.'
            : 'Open a round to put a clock on it.'}
        </p>
        <div className="admin__buttons">
          {ROUND_MINUTES.map((minutes) => (
            <button
              key={minutes}
              className="btn btn--small"
              type="button"
              disabled={busy || !votingOpen}
              onClick={() =>
                run(`Voting closes in ${minutes} min.`, () =>
                  api.admin.setRoundDeadline(minutes)
                )
              }
            >
              {minutes} min
            </button>
          ))}
          <button
            className="btn btn--small btn--ghost"
            type="button"
            disabled={busy || data.roundClosesAt === null}
            onClick={() =>
              run('Round clock cleared.', () => api.admin.clearRoundDeadline())
            }
          >
            Clear
          </button>
        </div>
      </div>

      <div className="clock">
        <div className="clock__head">
          <h3 className="clock__name">Next round in</h3>
          <span className="clock__value">
            {breakLeft === null ? 'no break' : formatCountdown(breakLeft)}
          </span>
        </div>
        <p className="admin__hint">
          Puts the TV on the intermission screen -- countdown, bear slideshow and
          a bear cam -- until you open the next round.
        </p>
        <div className="admin__buttons">
          {BREAK_MINUTES.map((minutes) => (
            <button
              key={minutes}
              className="btn btn--small"
              type="button"
              disabled={busy}
              onClick={() =>
                run(`Break running: ${minutes} min.`, () =>
                  api.admin.startIntermission(minutes)
                )
              }
            >
              {minutes} min
            </button>
          ))}
          <button
            className="btn btn--small btn--ghost"
            type="button"
            disabled={busy || data.intermissionUntil === null}
            onClick={() => run('Break over.', () => api.admin.endIntermission())}
          >
            End break
          </button>
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  )
}

function TieBreaker({
  matchup,
  bears,
  busy,
  onDecide,
}: {
  matchup: Matchup
  bears: Map<string, Bear>
  busy: boolean
  onDecide: (bearId: string, label: string) => void
}) {
  const bearA = bears.get(matchup.bearA)
  const bearB = matchup.bearB ? bears.get(matchup.bearB) : null
  if (!bearA || !bearB) return null

  return (
    <div className="tie">
      <p className="tie__line">
        {bearA.displayName} {voteCount(matchup, bearA.id)} &ndash;{' '}
        {voteCount(matchup, bearB.id)} {bearB.displayName}
      </p>
      <div className="tie__buttons">
        <button
          className="btn btn--small"
          type="button"
          disabled={busy}
          onClick={() => onDecide(bearA.id, `${bearA.displayName} advances.`)}
        >
          {bearA.displayName}
        </button>
        <button
          className="btn btn--small btn--ghost"
          type="button"
          disabled={busy}
          onClick={() => onDecide('random', 'Coin flipped.')}
        >
          🪙 Coin flip
        </button>
        <button
          className="btn btn--small"
          type="button"
          disabled={busy}
          onClick={() => onDecide(bearB.id, `${bearB.displayName} advances.`)}
        >
          {bearB.displayName}
        </button>
      </div>
    </div>
  )
}
