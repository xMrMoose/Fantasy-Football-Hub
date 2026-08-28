import { describe, it, expect } from "vitest";
import { computeStandings } from "../src/standings.js";
import type { Team, WeeklyMatchup } from "../src/types.js";

function team(id: string, conference: "AFC" | "NFC"): Team {
  return {
    teamId: id,
    season: "2026",
    conference,
    sourceLeagueId: conference === "AFC" ? "afc-league" : "nfc-league",
    sourceRosterId: Number(id.split("-")[1]),
    ownerId: `owner-${id}`,
    displayName: id,
    ownerDisplayName: id,
    avatar: null,
  };
}

function matchup(
  week: number,
  conference: "AFC" | "NFC",
  aId: string,
  aPoints: number | null,
  bId: string,
  bPoints: number | null,
  state: WeeklyMatchup["state"] = "final",
): WeeklyMatchup {
  return {
    matchupId: `${conference}-w${week}-${aId}-${bId}`,
    conference,
    sourceLeagueId: conference === "AFC" ? "afc-league" : "nfc-league",
    week,
    state,
    teamA: { teamId: aId, points: aPoints, customPoints: null, lineup: [] },
    teamB: { teamId: bId, points: bPoints, customPoints: null, lineup: [] },
    winnerTeamId: aPoints !== null && bPoints !== null ? (aPoints > bPoints ? aId : bPoints > aPoints ? bId : null) : null,
    customPointsUsed: false,
  };
}

describe("computeStandings", () => {
  const teams = [team("AFC-1", "AFC"), team("AFC-2", "AFC"), team("NFC-1", "NFC"), team("NFC-2", "NFC")];

  it("ranks by win percentage then points for then point diff", () => {
    const matchups = [
      matchup(1, "AFC", "AFC-1", 120, "AFC-2", 100),
      matchup(2, "AFC", "AFC-1", 90, "AFC-2", 110),
      matchup(1, "NFC", "NFC-1", 80, "NFC-2", 80), // tie
    ];
    const { afc, nfc } = computeStandings(teams, matchups);
    expect(afc[0].teamId).toBe("AFC-1");
    expect(afc[0].wins).toBe(1);
    expect(afc[0].losses).toBe(1);
    expect(nfc[0].ties).toBe(1);
    expect(nfc[1].ties).toBe(1);
  });

  it("breaks a win-percentage tie using points for", () => {
    const matchups = [
      matchup(1, "AFC", "AFC-1", 150, "AFC-2", 100),
      matchup(1, "NFC", "NFC-1", 120, "NFC-2", 90),
    ];
    // AFC-1 and NFC teams aren't compared directly; verify combined ranking uses points_for among 1-0 teams.
    const { combined } = computeStandings(teams, matchups);
    const undefeated = combined.filter((r) => r.wins === 1 && r.losses === 0);
    expect(undefeated[0].teamId).toBe("AFC-1"); // 150 pf > 120 pf
  });

  it("handles a three-team style scenario deterministically via team_id fallback", () => {
    const matchups: WeeklyMatchup[] = [];
    const { combined } = computeStandings(teams, matchups);
    // no games played — everyone 0-0-0, falls through to team_id ordering
    expect(combined.map((r) => r.teamId)).toEqual(["AFC-1", "AFC-2", "NFC-1", "NFC-2"]);
  });

  it("only counts final/overridden matchups, ignoring live/scheduled", () => {
    const matchups = [matchup(1, "AFC", "AFC-1", 100, "AFC-2", 50, "live")];
    const { afc } = computeStandings(teams, matchups);
    expect(afc.every((r) => r.gamesPlayed === 0)).toBe(true);
  });

  it("preserves decimal and negative point values", () => {
    const matchups = [matchup(1, "AFC", "AFC-1", 100.34, "AFC-2", -5.5)];
    const { afc } = computeStandings(teams, matchups);
    const winner = afc.find((r) => r.teamId === "AFC-1")!;
    const loser = afc.find((r) => r.teamId === "AFC-2")!;
    expect(winner.pointsFor).toBeCloseTo(100.34);
    expect(loser.pointsFor).toBeCloseTo(-5.5);
  });
});
