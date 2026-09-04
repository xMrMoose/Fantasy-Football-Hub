import type { AnyState, TeamMatchupSide } from "./types.js";
import type { SleeperNflState } from "./sleeperSchemas.js";

/**
 * Derives a matchup's state as of the current sync run. This is NOT
 * real-time: it reflects Sleeper's reported state at the moment the sync
 * script ran, updated only on the next scheduled/dispatched run.
 *
 * "final" is only ever asserted once the NFL state reports the matchup's
 * week has fully passed (season_type/week comparison) AND both sides have a
 * non-null point total. Never infer "final" merely because every currently
 * visible player has finished — that's exactly the guess the brief forbids.
 */
export function deriveMatchupState(
  week: number,
  nflState: SleeperNflState,
  teamA: TeamMatchupSide,
  teamB: TeamMatchupSide | null,
): AnyState {
  if (!teamB || !teamB.teamId) return "scheduled"; // bye week
  // Sleeper reports points as 0 (never null) for a week that hasn't happened
  // yet, so a future week can't be told apart from a 0-0 live game by points
  // alone — the week/nflState.week comparison is the only real signal.
  if (week > nflState.week && nflState.season_type !== "post") return "scheduled";
  const bothScored = teamA.points !== null && teamB.points !== null;
  const weekHasPassed = nflState.week > week || (nflState.season_type === "post" && nflState.week >= week);

  if (!bothScored) return "live";
  if (weekHasPassed) return "final";
  return "unofficial";
}
