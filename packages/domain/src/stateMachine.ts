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
  const bothScored = teamA.points !== null && teamB.points !== null;
  const weekHasPassed = nflState.week > week || (nflState.season_type === "post" && nflState.week >= week);

  if (!bothScored && week > nflState.week) return "scheduled";
  if (!bothScored) return "live";
  if (weekHasPassed) return "final";
  return "unofficial";
}
