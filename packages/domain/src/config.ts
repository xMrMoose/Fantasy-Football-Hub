import type { LeagueRules } from "./types.js";
import type { TiebreakKey } from "./standings.js";
import { DEFAULT_TIEBREAK_ORDER } from "./standings.js";

export const DEFAULT_LEAGUE_RULES: Omit<LeagueRules, "season" | "status" | "activeWeek"> = {
  rulesVersion: "v1",
  playoffStartWeek: 14,
  superBowlWeek: 17,
  playoffTeamCount: 6,
  playoffReseed: true,
  standingsTiebreakRules: DEFAULT_TIEBREAK_ORDER,
  playoffTieRule: "higher_seed",
};

export function tiebreakOrderFromRules(rules: LeagueRules): TiebreakKey[] {
  return rules.standingsTiebreakRules as TiebreakKey[];
}
