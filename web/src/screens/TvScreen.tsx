import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { api } from '../api'
import { usePoll } from '../hooks/usePoll'
import {
  bearMap,
  decisionBlurb,
  eliminationLine,
  projectedRounds,
} from '../lib/bracket'
import type { AppConfig, Bear, Matchup, Round, Snapshot } from '../types'
import { BearAvatar } from '../components/BearAvatar'
import { VoteBar } from '../components/VoteBar'
import { PawPrint } from '../components/PawPrint'
import { CreditFooter } from '../components/Disclosure'
import { ChampionReveal } from './ChampionReveal'
import './TvScreen.css'

/** The big-screen view. Designed to be readable across a room at 1080p+. */
export function TvScreen() {
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api.config(controller.signal).then(setConfig).catch(() => setConfig(null))
    return () => controller.abort()
  }, [])

  const { data, error } = usePoll<Snapshot>(
    (signal) => api.state(signal),
    config?.pollIntervalMs ?? 2000
  )

  // Where to send phones. An explicit VOTE_URL wins, since the TV might be on a
  // different address than the one guests can reach.
  const voteUrl = config?.voteUrl || `${window.location.origin}/vote`

  if (!data) {
    return (
      <div className="tv tv--loading">
        <PawPrint size={90} color="var(--fur)" />
        <h1 className="tv__loadingtitle">Fat Bear Week</h1>
        <p className={error ? 'alert' : 'tv__loadingline'}>
          {error ?? 'Rounding up the bears…'}
        </p>
      </div>
    )
  }

  const bears = bearMap(data)
  const champion = data.tournament.championBearId
    ? bears.get(data.tournament.championBearId)
    : null

  if (champion && data.tournament.championRevealed) {
    return <ChampionReveal bear={champion} snapshot={data} />
  }

  return (
    <div className="tv">
      <TvHeader snapshot={data} voteUrl={voteUrl} awaitingReveal={Boolean(champion)} />

      <div className="tv__bracket">
        {data.rounds.map((round) => (
          <RoundColumn
            key={round.id}
            round={round}
            bears={bears}
            isCurrent={round.id === data.currentRoundId}
          />
        ))}
        {/* Ghost columns so the full bracket shape is visible from round one. */}
        {projectedRounds(data).map((future) => (
          <GhostColumn
            key={future.key}
            name={future.name}
            matchupCount={future.matchupCount}
          />
        ))}
      </div>

      <CreditFooter variant="tv" />
    </div>
  )
}

/* ------------------------------------------------------------------ header */

function TvHeader({
  snapshot,
  voteUrl,
  awaitingReveal,
}: {
  snapshot: Snapshot
  voteUrl: string
  awaitingReveal: boolean
}) {
  const round = snapshot.rounds.find((item) => item.id === snapshot.currentRoundId)
  const turnout = snapshot.turnout

  let statusLine = 'Waiting on the host'
  if (awaitingReveal) statusLine = 'A champion has been decided…'
  else if (round?.status === 'open') statusLine = 'Voting is OPEN — grab your phone'
  else if (round?.status === 'closed') statusLine = 'Votes counted'
  else if (round?.status === 'pending') statusLine = 'Voting opens shortly'

  return (
    <header className="tv__header">
      <div className="tv__brand">
        <h1 className="tv__title">Fat Bear Week</h1>
        <p className="tv__subtitle">
          {awaitingReveal
            ? 'Drumroll, please.'
            : (round?.tagline ?? 'Eleven round bears. One crown.')}
        </p>
      </div>

      <div className="tv__status">
        {round && !awaitingReveal && (
          <>
            <p className="tv__roundname">{round.name}</p>
            <span
              className={`pill ${
                round.status === 'open'
                  ? 'pill--open'
                  : round.status === 'closed'
                    ? 'pill--closed'
                    : 'pill--pending'
              }`}
            >
              {statusLine}
            </span>
          </>
        )}
        {awaitingReveal && <p className="tv__roundname">{statusLine}</p>}

        <p className="tv__turnout">
          {turnout && round?.status === 'open' ? (
            <>
              <strong>
                {turnout.finished}/{turnout.total}
              </strong>{' '}
              judges finished
            </>
          ) : (
            <>
              <strong>{snapshot.guestCount}</strong>{' '}
              {snapshot.guestCount === 1 ? 'judge' : 'judges'} in the room
            </>
          )}
        </p>
      </div>

      <div className="tv__join">
        <div className="tv__qr">
          <QRCodeSVG
            value={voteUrl}
            size={148}
            level="M"
            bgColor="#fff5e4"
            fgColor="#3a2618"
          />
        </div>
        <div className="tv__joinlabel">
          <p className="tv__joinhead">Scan to vote</p>
          <p className="tv__joinurl">{voteUrl.replace(/^https?:\/\//, '')}</p>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------- round column */

function RoundColumn({
  round,
  bears,
  isCurrent,
}: {
  round: Round
  bears: Map<string, Bear>
  isCurrent: boolean
}) {
  // A big opening round gets extra width so its cards can wrap into
  // sub-columns instead of running off the bottom of the TV.
  const wide = round.matchups.length > 4

  return (
    <section
      className={`column ${isCurrent ? 'is-current' : ''} ${wide ? 'column--wide' : ''}`}
    >
      <header className="column__header">
        <h2 className="column__name">{round.name}</h2>
        <span
          className={`pill pill--${round.status} column__pill`}
          title={`Round ${round.index + 1}`}
        >
          {round.status === 'open'
            ? 'live'
            : round.status === 'closed'
              ? 'done'
              : 'up next'}
        </span>
      </header>

      <div className="column__matchups">
        {round.matchups.map((matchup) => (
          <MatchupCard
            key={matchup.id}
            matchup={matchup}
            bears={bears}
            live={isCurrent && round.status === 'open'}
          />
        ))}
      </div>
    </section>
  )
}

/** A round that has not been built yet: empty slots waiting to be filled. */
function GhostColumn({ name, matchupCount }: { name: string; matchupCount: number }) {
  return (
    <section
      className={`column column--ghost ${matchupCount > 4 ? 'column--wide' : ''}`}
    >
      <header className="column__header">
        <h2 className="column__name">{name}</h2>
        <span className="pill pill--pending column__pill">to come</span>
      </header>
      <div className="column__matchups">
        {Array.from({ length: matchupCount }, (_, i) => (
          <div key={i} className="ghost">
            <span className="ghost__slot" />
            <span className="ghost__vs">vs</span>
            <span className="ghost__slot" />
          </div>
        ))}
      </div>
    </section>
  )
}

function MatchupCard({
  matchup,
  bears,
  live,
}: {
  matchup: Matchup
  bears: Map<string, Bear>
  live: boolean
}) {
  const bearA = bears.get(matchup.bearA)
  const bearB = matchup.bearB ? bears.get(matchup.bearB) : null

  if (!bearA) return null

  // A bye is a single bear coasting through. Render it as such.
  if (matchup.isBye || !bearB) {
    return (
      <article className="matchup matchup--bye card">
        <div className="matchup__side">
          <BearAvatar bear={bearA} size="clamp(34px, 2vw, 48px)" />
          <div className="matchup__id">
            <p className="matchup__name">{bearA.displayName}</p>
            <p className="matchup__title">{bearA.title}</p>
          </div>
        </div>
        <p className="matchup__byeline">
          <PawPrint size={16} color="var(--fur)" /> Bye round — advances for free
        </p>
      </article>
    )
  }

  const settled = Boolean(matchup.winner)
  const loserId = settled ? (matchup.winner === bearA.id ? bearB.id : bearA.id) : null

  return (
    <article
      className={`matchup card ${live ? 'is-live' : ''} ${settled ? 'is-settled' : ''}`}
    >
      <MatchupSide
        bear={bearA}
        isWinner={matchup.winner === bearA.id}
        isLoser={loserId === bearA.id}
      />

      <div className="matchup__bar">
        <VoteBar matchup={matchup} bearA={bearA} bearB={bearB} size="compact" />
      </div>

      <MatchupSide
        bear={bearB}
        isWinner={matchup.winner === bearB.id}
        isLoser={loserId === bearB.id}
      />

      <p className="matchup__footer">
        {matchup.tied ? '☠ Dead heat — host must settle it' : decisionBlurb(matchup)}
      </p>
    </article>
  )
}

function MatchupSide({
  bear,
  isWinner,
  isLoser,
}: {
  bear: Bear
  isWinner: boolean
  isLoser: boolean
}) {
  return (
    <div className={`matchup__side ${isLoser ? 'is-out' : ''} ${isWinner ? 'is-in' : ''}`}>
      <BearAvatar bear={bear} size="clamp(34px, 2vw, 48px)" sleeping={isLoser} />
      <div className="matchup__id">
        <p className="matchup__name">
          {isWinner && <span aria-hidden="true">👑 </span>}
          {bear.displayName}
        </p>
        <p className="matchup__title">
          {isLoser ? eliminationLine(bear) : bear.title}
        </p>
      </div>
    </div>
  )
}
