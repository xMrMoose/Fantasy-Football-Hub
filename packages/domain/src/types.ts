export type Conference = "AFC" | "NFC";

export type MatchupState = "scheduled" | "live" | "unofficial" | "final";

export type ExceptionalState =
  | "awaiting_participant"
  | "source_incomplete"
  | "tied"
  | "overridden"
  | "void";

export type AnyState = MatchupState | ExceptionalState;

export interface SourceLeague {
  season: string;
  conference: Conference;
  sleeperLeagueId: string;
  status: string;
  rosterPositions: string[];
  scoringSettingsHash: string;
  previousLeagueId: string | null;
  lastValidatedAt: string;
}

export interface Team {
  teamId: string; // composite: `${conference}-${sourceRosterId}`
  season: string;
  conference: Conference;
  sourceLeagueId: string;
  sourceRosterId: number;
  ownerId: string | null;
  displayName: string;
  ownerDisplayName: string | null;
  avatar: string | null;
}

export interface PlayerLineupEntry {
  playerId: string;
  slot: string;
  starter: boolean;
  points: number | null;
  status: string | null;
}

/**
 * One seat on a roster, in the league's configured `rosterPositions` order.
 * `playerId: null` is a genuinely empty seat (undrafted league, dropped player)
 * — the team page renders these as empty slots rather than hiding them.
 */
export interface RosterSlot {
  slot: string; // "QB" | "RB" | "FLEX" | "BN" | "IR" | ...
  starter: boolean;
  playerId: string | null;
}

export interface TeamRoster {
  teamId: string;
  season: string;
  conference: Conference;
  sourceRosterId: number;
  slots: RosterSlot[];
  /** Every rostered player id, including any beyond the configured seat count. */
  playerIds: string[];
}

export interface TeamMatchupSide {
  teamId: string;
  points: number | null;
  customPoints: number | null;
  lineup: PlayerLineupEntry[];
}

export interface WeeklyMatchup {
  matchupId: string; // namespaced: `${conference}-${sleeperMatchupId}`
  conference: Conference;
  sourceLeagueId: string;
  week: number;
  state: AnyState;
  teamA: TeamMatchupSide;
  teamB: TeamMatchupSide;
  winnerTeamId: string | null;
  customPointsUsed: boolean;
}

export interface StandingsRow {
  teamId: string;
  conference: Conference;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  gamesPlayed: number;
}

export interface StandingsSnapshot {
  generatedAt: string;
  season: string;
  asOfWeek: number;
  tiebreakRulesVersion: string;
  scoringParityWarning: boolean;
  combined: StandingsRow[];
  afc: StandingsRow[];
  nfc: StandingsRow[];
}

export interface PlayoffSeed {
  seed: number;
  teamId: string;
  source: "auto" | "override";
}

export interface PlayoffSeeds {
  season: string;
  conference: Conference;
  rulesVersion: string;
  lockedAt: string | null;
  seeds: PlayoffSeed[];
}

export interface PlayoffParticipant {
  seed: number | null;
  teamId: string | null;
  score: number | null;
  source: "auto" | "override" | "bye";
}

export interface PlayoffMatchup {
  round: "wildcard" | "semifinal" | "championship";
  week: number;
  conference: Conference;
  participants: PlayoffParticipant[];
  winnerTeamId: string | null;
  state: AnyState;
  provenance: "auto" | "overridden";
}

export interface PlayoffBracket {
  season: string;
  conference: Conference;
  reseed: boolean;
  /** false = a projected "playoff picture" recomputed from current standings each sync; true = locked/official once Week 14 seeding is set. */
  official: boolean;
  asOfWeek: number;
  /** false before any regular-season game has been played — seeding is a placeholder standings order (alphabetical tiebreak), not a meaningful ranking yet. */
  hasPlayedGames: boolean;
  matchups: PlayoffMatchup[];
}

export interface SuperBowlOverrideEntry {
  field: string;
  before: unknown;
  after: unknown;
  reason: string;
  actor: string;
  timestamp: string;
}

export interface SuperBowl {
  season: string;
  week: number;
  state: AnyState;
  afcChampionTeamId: string | null;
  nfcChampionTeamId: string | null;
  lineupSnapshot: {
    afc: PlayerLineupEntry[];
    nfc: PlayerLineupEntry[];
  } | null;
  scores: { afc: number | null; nfc: number | null };
  winnerTeamId: string | null;
  lastUpdated: string;
  overrideHistory: SuperBowlOverrideEntry[];
  blockingReason: string | null;
}

export interface ManualOverride {
  id: string;
  entityType: "playoff_seed" | "playoff_matchup" | "super_bowl" | "matchup" | "standings";
  entityId: string;
  field: string;
  before: unknown;
  after: unknown;
  reason: string;
  actor: string;
  appliesFromSeason: string;
  createdAt: string;
}

export interface LeagueRules {
  season: string;
  status: string;
  activeWeek: number;
  rulesVersion: string;
  playoffStartWeek: number;
  superBowlWeek: number;
  playoffTeamCount: number;
  playoffReseed: boolean;
  standingsTiebreakRules: string[];
  playoffTieRule: "bench_points" | "higher_seed" | "commissioner_decision";
}

export interface SyncRunLeagueResult {
  status: "ok" | "failed" | "partial";
  rosterCount: number | null;
  rawHash: string | null;
  error: string | null;
}

export interface SyncRunEntry {
  runId: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  leagues: { afc: SyncRunLeagueResult; nfc: SyncRunLeagueResult };
  warnings: string[];
  errors: string[];
  weeksUpdated: number[];
}
