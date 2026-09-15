import { useCallback, useEffect, useState } from 'react'

import { api } from '../api'
import { usePoll } from '../hooks/usePoll'
import { useGuest } from '../hooks/useGuest'
import { bearMap, currentRound, votableMatchups, voteCount } from '../lib/bracket'
import type { AppConfig, Bear, Matchup, Snapshot } from '../types'
import { BearAvatar } from '../components/BearAvatar'
import { PawDivider, PawPrint } from '../components/PawPrint'
import { CreditFooter } from '../components/Disclosure'
import { Confetti } from '../components/Confetti'
import { JoinForm } from './JoinForm'
import './VoteScreen.css'

/** Guest phone screen: one matchup at a time, thumb-sized targets. */
export function VoteScreen() {
  const { guest, checking, signIn, signOut } = useGuest()
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api.config(controller.signal).then(setConfig).catch(() => setConfig(null))
    return () => controller.abort()
  }, [])

  const { data, error, refresh } = usePoll<Snapshot>(
    (signal) => api.state(signal),
    config?.pollIntervalMs ?? 2000,
    Boolean(guest)
  )

  if (checking) {
    return <Splash line="Checking your credentials…" />
  }

  if (!guest) {
    return <JoinForm config={config} onJoined={signIn} />
  }

  if (!data) {
    return <Splash line={error ?? 'Waking the bears…'} error={Boolean(error)} />
  }

  return (
    <Ballot
      snapshot={data}
      guestName={guest.name}
      onVoted={refresh}
      onSignOut={signOut}
      connectionError={error}
    />
  )
}

function Splash({ line, error = false }: { line: string; error?: boolean }) {
  return (
    <div className="vote__splash">
      <PawPrint size={56} color="var(--fur)" />
      <p className={error ? 'alert' : 'vote__splashline'}>{line}</p>
    </div>
  )
}

/* -------------------------------------------------------------- the ballot */

interface BallotProps {
  snapshot: Snapshot
  guestName: string
  onVoted: () => void
  onSignOut: () => void
  connectionError: string | null
}

function Ballot({ snapshot, guestName, onVoted, onSignOut, connectionError }: BallotProps) {
  const bears = bearMap(snapshot)
  const round = currentRound(snapshot)
  const matchups = votableMatchups(round)

  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)

  const pending = matchups.filter((matchup) => !snapshot.myVotes[matchup.id])
  const active = pending[0] ?? null

  // A new matchup means a clean slate -- never carry a selection across.
  useEffect(() => {
    setSelected(null)
    setVoteError(null)
  }, [active?.id])

  const submit = useCallback(async () => {
    if (!active || !selected) return
    setSubmitting(true)
    setVoteError(null)
    try {
      await api.vote(active.id, selected)
      onVoted()
    } catch (err) {
      setVoteError((err as Error).message)
      onVoted()
    } finally {
      setSubmitting(false)
    }
  }, [active, selected, onVoted])

  const champion = snapshot.tournament.championBearId
    ? bears.get(snapshot.tournament.championBearId)
    : null

  if (champion && snapshot.tournament.championRevealed) {
    return <PhoneChampion bear={champion} guestName={guestName} onSignOut={onSignOut} />
  }

  const header = (
    <header className="vote__header">
      <div>
        <p className="vote__whoami">
          Judge <strong>{guestName}</strong>
        </p>
        {round && <h1 className="vote__round">{round.name}</h1>}
      </div>
      <button className="btn btn--ghost btn--small" type="button" onClick={onSignOut}>
        Not me
      </button>
    </header>
  )

  let body: React.ReactNode

  if (!round || round.status === 'pending') {
    body = (
      <WaitingCard
        title="Hold your salmon"
        line="The host has not opened voting yet. Keep snacking."
        round={round?.name}
      />
    )
  } else if (round.status === 'closed') {
    body = <RoundResults snapshot={snapshot} />
  } else if (active) {
    const bearA = bears.get(active.bearA)
    const bearB = active.bearB ? bears.get(active.bearB) : undefined

    body =
      bearA && bearB ? (
        <>
          <p className="vote__progress">
            Matchup {matchups.length - pending.length + 1} of {matchups.length}
          </p>
          <p className="vote__prompt">Which bear is rounder? Vote with your gut.</p>

          {voteError && <p className="alert">{voteError}</p>}

          <div className="vote__stack">
            <BearChoice
              bear={bearA}
              selected={selected === bearA.id}
              onSelect={() => setSelected(bearA.id)}
            />
            <div className="vote__versus" aria-hidden="true">
              <span>VS</span>
            </div>
            <BearChoice
              bear={bearB}
              selected={selected === bearB.id}
              onSelect={() => setSelected(bearB.id)}
            />
          </div>

          <div className="vote__lockin">
            <button
              className="btn btn--go btn--wide"
              type="button"
              disabled={!selected || submitting}
              onClick={submit}
            >
              {submitting
                ? 'Submitting…'
                : selected
                  ? `Lock in ${bears.get(selected)?.displayName ?? 'this bear'}`
                  : 'Tap a bear first'}
            </button>
            <p className="vote__lockinhint">
              One vote per matchup. No takebacks, no recounts, no appeals.
            </p>
          </div>
        </>
      ) : (
        <WaitingCard title="Something is off" line="This matchup is missing a bear." />
      )
  } else {
    body = <BallotIn snapshot={snapshot} matchups={matchups} />
  }

  return (
    <div className="vote">
      {header}
      {connectionError && <p className="alert alert--quiet">{connectionError}</p>}
      <main className="vote__main">{body}</main>
      <CreditFooter />
    </div>
  )
}

/* ------------------------------------------------------------- sub-screens */

function BearChoice({
  bear,
  selected,
  onSelect,
}: {
  bear: Bear
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`choice ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="choice__top">
        <BearAvatar bear={bear} size={88} />
        <div className="choice__id">
          <h2 className="choice__name">{bear.displayName}</h2>
          <span className="pill">{bear.title}</span>
        </div>
        {/* Sits up here, next to the name, so the pick is obvious without
            scrolling past a long bio. */}
        <span className="choice__check" aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      </div>
      <p className="choice__bio">{bear.bio}</p>
      <span className="choice__hint" aria-hidden="true">
        {selected ? 'Picked — lock it in below' : 'Tap to pick'}
      </span>
    </button>
  )
}

function WaitingCard({
  title,
  line,
  round,
}: {
  title: string
  line: string
  round?: string
}) {
  return (
    <div className="waiting card">
      <PawPrint size={52} color="var(--honey-deep)" />
      <h2 className="waiting__title">{title}</h2>
      <p className="waiting__line">{line}</p>
      {round && <p className="waiting__round">Up next: {round}</p>}
    </div>
  )
}

/** Shown once a guest has voted in every matchup in the open round. */
function BallotIn({ snapshot, matchups }: { snapshot: Snapshot; matchups: Matchup[] }) {
  const bears = bearMap(snapshot)

  return (
    <div className="ballotin">
      <div className="waiting card">
        <span className="ballotin__stamp" aria-hidden="true">
          ✓
        </span>
        <h2 className="waiting__title">Ballot in</h2>
        <p className="waiting__line">
          All {matchups.length} votes counted. Go look at the big screen and start
          arguing with someone.
        </p>
        {snapshot.turnout && (
          <p className="waiting__round">
            {snapshot.turnout.finished} of {snapshot.turnout.total} judges finished
          </p>
        )}
      </div>

      <PawDivider />

      <h3 className="ballotin__heading">Your picks</h3>
      <ul className="ballotin__list">
        {matchups.map((matchup) => {
          const pickId = snapshot.myVotes[matchup.id]
          const pick = pickId ? bears.get(pickId) : undefined
          if (!pick) return null
          return (
            <li key={matchup.id} className="ballotin__row">
              <BearAvatar bear={pick} size={44} />
              <span className="ballotin__pick">{pick.displayName}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Between rounds: what just happened, who is napping. */
function RoundResults({ snapshot }: { snapshot: Snapshot }) {
  const bears = bearMap(snapshot)
  const round = currentRound(snapshot)
  if (!round) return null

  const contested = round.matchups.filter((matchup) => !matchup.isBye)

  return (
    <div className="results">
      <div className="waiting card">
        <PawPrint size={48} color="var(--forest)" />
        <h2 className="waiting__title">Votes are in</h2>
        <p className="waiting__line">
          {round.name} is done. Waiting on the host to start the next one.
        </p>
      </div>

      <ul className="results__list">
        {contested.map((matchup) => {
          const bearA = bears.get(matchup.bearA)
          const bearB = matchup.bearB ? bears.get(matchup.bearB) : undefined
          if (!bearA || !bearB) return null

          const winner = matchup.winner === bearA.id ? bearA : bearB
          const loser = matchup.winner === bearA.id ? bearB : bearA
          const myPick = snapshot.myVotes[matchup.id]

          if (!matchup.winner) {
            return (
              <li key={matchup.id} className="results__row card">
                <p className="results__tie">
                  {bearA.displayName} vs {bearB.displayName} &mdash; dead heat. The
                  host has to settle it.
                </p>
              </li>
            )
          }

          return (
            <li key={matchup.id} className="results__row card">
              <BearAvatar bear={winner} size={52} />
              <div className="results__text">
                <strong>{winner.displayName}</strong> advances
                <span className="results__detail">
                  {loser.displayName} is hibernating early &middot;{' '}
                  {voteCount(matchup, winner.id)}&ndash;{voteCount(matchup, loser.id)}
                </span>
              </div>
              {myPick === winner.id && (
                <span className="results__badge" title="You called it">
                  called it
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PhoneChampion({
  bear,
  guestName,
  onSignOut,
}: {
  bear: Bear
  guestName: string
  onSignOut: () => void
}) {
  return (
    <div className="vote">
      <Confetti active />
      <main className="vote__main">
        <div className="phonechamp card">
          <p className="phonechamp__kicker">Your 2025 Fat Bear Champion</p>
          <BearAvatar bear={bear} size="min(60vw, 240px)" />
          <h1 className="phonechamp__name">{bear.displayName}</h1>
          <span className="pill">{bear.title}</span>
          <p className="phonechamp__bio">{bear.bio}</p>
          <p className="phonechamp__sign">
            Thanks for judging, {guestName}. Go get a snack in their honor.
          </p>
          <button className="btn btn--ghost btn--small" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </main>
      <CreditFooter />
    </div>
  )
}
