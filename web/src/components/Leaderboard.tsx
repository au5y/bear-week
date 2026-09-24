import type { LeaderboardEntry } from '../types'
import './Leaderboard.css'

/** 1st, 2nd and 3rd get a medal; everyone else gets their number. */
const MEDALS = ['🥇', '🥈', '🥉']

function rankBadge(entry: LeaderboardEntry): string {
  const medal = MEDALS[entry.rank - 1]
  if (!medal) return `${entry.rank}`
  return entry.shared ? `${medal}=` : medal
}

interface Props {
  entries: LeaderboardEntry[]
  /** How many decided matchups the scores are out of. */
  scoredMatchups: number
  /**
   * 'tv' is the across-the-room version, 'panel' stands on its own as a card,
   * and 'bare' drops the frame for when it already sits inside one.
   */
  variant?: 'tv' | 'panel' | 'bare'
  /** Show only the top N. Left off, everyone is listed. */
  limit?: number
  /** Marks one row as "you", for the guest's own phone. */
  highlightGuestId?: number | null
  title?: string
}

/**
 * Who is calling the bears right. Scored only on matchups in closed rounds, so
 * this appears the moment the host closes a round and never moves mid-vote.
 */
export function Leaderboard({
  entries,
  scoredMatchups,
  variant = 'panel',
  limit,
  highlightGuestId = null,
  title = 'Leaderboard',
}: Props) {
  if (entries.length === 0 || scoredMatchups === 0) return null

  const shown = limit ? entries.slice(0, limit) : entries
  const hidden = entries.length - shown.length
  const leader = entries[0]?.correct ?? 0

  return (
    <section className={`board board--${variant}`}>
      <header className="board__header">
        <h2 className="board__title">{title}</h2>
        <p className="board__sub">
          out of {scoredMatchups} decided {scoredMatchups === 1 ? 'matchup' : 'matchups'}
        </p>
      </header>

      <ol className="board__list">
        {shown.map((entry) => (
          <li
            key={entry.guestId}
            className={`board__row ${
              entry.guestId === highlightGuestId ? 'is-me' : ''
            } ${entry.rank === 1 ? 'is-top' : ''}`.trim()}
          >
            <span className="board__rank">{rankBadge(entry)}</span>
            <span className="board__name">{entry.name}</span>
            <span
              className="board__track"
              aria-hidden="true"
              style={{
                // Relative to the leader, so the bar always has a full row.
                ['--fill' as string]: `${leader > 0 ? (entry.correct / leader) * 100 : 0}%`,
              }}
            >
              <span className="board__fill" />
            </span>
            <span className="board__score">{entry.correct}</span>
          </li>
        ))}
      </ol>

      {hidden > 0 && (
        <p className="board__more">
          and {hidden} more {hidden === 1 ? 'judge' : 'judges'}
        </p>
      )}
    </section>
  )
}
