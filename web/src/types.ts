/** Shapes returned by the backend. Mirrors server/src/tournament.js snapshot(). */

export type RoundStatus = 'pending' | 'open' | 'closed'
export type TournamentStatus = 'setup' | 'running' | 'complete'

export interface Bear {
  id: string
  number: string
  name: string | null
  displayName: string
  title: string
  bio: string
  color: string
  accent: string
  seed: number
  photoUrl: string | null
  /** CSS object-position for the circular photo crop, e.g. "50% 30%". */
  photoFocus: string | null
  eliminatedRound: number | null
}

export interface Matchup {
  id: number
  slot: number
  isBye: boolean
  bearA: string
  bearB: string | null
  winner: string | null
  decidedBy: 'votes' | 'bye' | 'coinflip' | 'host' | null
  tied: boolean
  votes: Record<string, number>
  totalVotes: number
}

export interface Round {
  id: number
  index: number
  name: string
  tagline: string
  status: RoundStatus
  matchups: Matchup[]
}

export interface Turnout {
  finished: number
  total: number
  votableMatchups: number
}

export interface Snapshot {
  tournament: {
    status: TournamentStatus
    championBearId: string | null
    championRevealed: boolean
    totalRounds: number
    bearsRemaining: number
  }
  bears: Bear[]
  rounds: Round[]
  currentRoundId: number | null
  turnout: Turnout | null
  guestCount: number
  myVotes: Record<string, string>
  serverTime: string
}

export interface RosterEntry {
  id: number
  name: string
  hasPin: boolean
  votesCast: number
  joinedAt: string
}

export interface AdminSnapshot extends Snapshot {
  guests: RosterEntry[]
}

export interface Guest {
  id: number
  name: string
  hasPin: boolean
}

export interface AppConfig {
  requiresPartyPin: boolean
  voteUrl: string | null
  pollIntervalMs: number
}
