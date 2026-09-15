import type { Bear, Snapshot } from '../types'
import { bearMap } from '../lib/bracket'
import { BearAvatar } from '../components/BearAvatar'
import { Confetti } from '../components/Confetti'
import { PawPrint } from '../components/PawPrint'
import { CreditFooter } from '../components/Disclosure'
import './ChampionReveal.css'

/** Full-screen celebration for the TV. Trophy, confetti, enormous bear. */
export function ChampionReveal({
  bear,
  snapshot,
}: {
  bear: Bear
  snapshot: Snapshot
}) {
  const bears = bearMap(snapshot)

  // The road to the crown: who this bear beat, round by round.
  const victories = snapshot.rounds
    .map((round) => {
      const matchup = round.matchups.find((item) => item.winner === bear.id)
      if (!matchup) return null

      if (matchup.isBye || !matchup.bearB) {
        return { round: round.name, note: 'walked in on a bye' }
      }

      const loserId = matchup.bearA === bear.id ? matchup.bearB : matchup.bearA
      const loser = bears.get(loserId)
      const mine = matchup.votes[bear.id] ?? 0
      const theirs = matchup.votes[loserId] ?? 0

      return {
        round: round.name,
        note: `beat ${loser?.displayName ?? 'a rival'} ${mine}–${theirs}`,
      }
    })
    .filter((entry): entry is { round: string; note: string } => entry !== null)

  return (
    <div className="champ">
      <Confetti active />

      <div className="champ__inner">
        <div className="champ__crown" aria-hidden="true">
          🏆
        </div>

        <p className="champ__kicker">
          <PawPrint size={22} color="var(--bark)" />
          2025 Fat Bear Champion
          <PawPrint size={22} color="var(--bark)" />
        </p>

        <div className="champ__portrait">
          <BearAvatar bear={bear} size="min(30vh, 34vw)" />
        </div>

        <h1 className="champ__name">{bear.displayName}</h1>
        <p className="champ__title">{bear.title}</p>
        <p className="champ__bio">{bear.bio}</p>

        {victories.length > 0 && (
          <ul className="champ__road">
            {victories.map((entry) => (
              <li key={entry.round} className="champ__roadrow">
                <span className="champ__roadround">{entry.round}</span>
                <span className="champ__roadnote">{entry.note}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="champ__signoff">
          Undisputed. Unbothered. Deeply, gloriously round.
        </p>
      </div>

      <CreditFooter variant="tv" />
    </div>
  )
}
