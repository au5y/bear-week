import type { Bear, Matchup } from '../types'
import { votePercent } from '../lib/bracket'
import './VoteBar.css'

/**
 * Two-sided tally bar. Shows counts while voting is live so the TV has
 * something to react to, and the winning side gets a crown when it is settled.
 */

interface Props {
  matchup: Matchup
  bearA: Bear
  bearB: Bear
  /** Hide the numbers until the round closes (used on guest phones). */
  hideCounts?: boolean
  /** 'compact' trims vertical space so a TV bracket column fits on screen. */
  size?: 'compact' | 'normal' | 'large'
}

export function VoteBar({ matchup, bearA, bearB, hideCounts = false, size = 'normal' }: Props) {
  const percent = votePercent(matchup)
  const countA = matchup.votes[bearA.id] ?? 0
  const countB = matchup.votes[bearB.id] ?? 0
  const settled = Boolean(matchup.winner)

  return (
    <div className={`votebar votebar--${size}`}>
      <div className="votebar__track">
        <div
          className={`votebar__fill votebar__fill--a ${
            settled && matchup.winner === bearA.id ? 'is-winner' : ''
          }`}
          style={{ width: `${percent.a}%`, background: bearA.color }}
        />
        <div
          className={`votebar__fill votebar__fill--b ${
            settled && matchup.winner === bearB.id ? 'is-winner' : ''
          }`}
          style={{ width: `${percent.b}%`, background: bearB.color }}
        />
      </div>

      {!hideCounts && (
        <div className="votebar__legend">
          <span className="votebar__count">
            {matchup.winner === bearA.id && <span aria-hidden="true">👑 </span>}
            {countA}
          </span>
          <span className="votebar__total">
            {matchup.totalVotes === 0
              ? 'no votes yet'
              : `${matchup.totalVotes} ${matchup.totalVotes === 1 ? 'vote' : 'votes'}`}
          </span>
          <span className="votebar__count">
            {countB}
            {matchup.winner === bearB.id && <span aria-hidden="true"> 👑</span>}
          </span>
        </div>
      )}
    </div>
  )
}
