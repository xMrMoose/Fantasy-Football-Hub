import { describe, it, expect } from "vitest";
import { combinePoints, pairMatchups, normalizeTeams, stableHash } from "../src/normalize.js";
import type { SleeperMatchupEntry, SleeperRoster, SleeperUser } from "../src/sleeperSchemas.js";

describe("combinePoints", () => {
  it("preserves null when both fields are unknown", () => {
    expect(combinePoints(undefined, undefined)).toBeNull();
  });

  it("combines whole and decimal correctly", () => {
    expect(combinePoints(100, 34)).toBeCloseTo(100.34);
  });

  it("handles negative whole values", () => {
    expect(combinePoints(-5, 50)).toBeCloseTo(-4.5);
  });
});

describe("pairMatchups", () => {
  it("pairs two entries sharing a matchup_id", () => {
    const entries: SleeperMatchupEntry[] = [
      { roster_id: 1, matchup_id: 5, points: 100 },
      { roster_id: 2, matchup_id: 5, points: 90 },
    ];
    const { matchups, unpaired, overCrowded } = pairMatchups(entries, "AFC", "afc-league", 1);
    expect(matchups).toHaveLength(1);
    expect(matchups[0].winnerTeamId).toBe("AFC-1");
    expect(unpaired).toHaveLength(0);
    expect(overCrowded).toHaveLength(0);
  });

  it("treats a missing matchup_id as a bye week", () => {
    const entries: SleeperMatchupEntry[] = [{ roster_id: 1, matchup_id: null, points: 100 }];
    const { matchups, unpaired } = pairMatchups(entries, "AFC", "afc-league", 1);
    expect(matchups).toHaveLength(0);
    expect(unpaired).toHaveLength(1);
  });

  it("flags more than two entries sharing a matchup_id", () => {
    const entries: SleeperMatchupEntry[] = [
      { roster_id: 1, matchup_id: 5, points: 100 },
      { roster_id: 2, matchup_id: 5, points: 90 },
      { roster_id: 3, matchup_id: 5, points: 80 },
    ];
    const { overCrowded } = pairMatchups(entries, "AFC", "afc-league", 1);
    expect(overCrowded).toEqual([5]);
  });

  it("never infers a winner when a point total is missing", () => {
    const entries: SleeperMatchupEntry[] = [
      { roster_id: 1, matchup_id: 5, points: null },
      { roster_id: 2, matchup_id: 5, points: 90 },
    ];
    const { matchups } = pairMatchups(entries, "AFC", "afc-league", 1);
    expect(matchups[0].winnerTeamId).toBeNull();
  });

  it("never infers a winner on a tie", () => {
    const entries: SleeperMatchupEntry[] = [
      { roster_id: 1, matchup_id: 5, points: 100 },
      { roster_id: 2, matchup_id: 5, points: 100 },
    ];
    const { matchups } = pairMatchups(entries, "AFC", "afc-league", 1);
    expect(matchups[0].winnerTeamId).toBeNull();
  });

  it("drops Sleeper's '0' placeholder for empty pre-draft roster slots", () => {
    const entries: SleeperMatchupEntry[] = [
      { roster_id: 1, matchup_id: 5, points: 0, starters: ["0", "0"], players: [] },
      { roster_id: 2, matchup_id: 5, points: 0, starters: ["0", "0"], players: [] },
    ];
    const { matchups } = pairMatchups(entries, "AFC", "afc-league", 1);
    expect(matchups[0].teamA.lineup).toHaveLength(0);
    expect(matchups[0].teamB.lineup).toHaveLength(0);
  });
});

describe("normalizeTeams", () => {
  it("falls back to a generated name when no owner metadata exists", () => {
    const rosters: SleeperRoster[] = [{ roster_id: 7, owner_id: null }];
    const teams = normalizeTeams(rosters, [], "AFC", "afc-league", "2026");
    expect(teams[0].displayName).toBe("Team 7");
    expect(teams[0].teamId).toBe("AFC-7");
  });

  it("prefers the user's team_name metadata over display_name", () => {
    const rosters: SleeperRoster[] = [{ roster_id: 1, owner_id: "u1" }];
    const users: SleeperUser[] = [{ user_id: "u1", display_name: "jsmith", metadata: { team_name: "The Champs" } }];
    const teams = normalizeTeams(rosters, users, "AFC", "afc-league", "2026");
    expect(teams[0].displayName).toBe("The Champs");
    expect(teams[0].ownerDisplayName).toBe("jsmith");
  });
});

describe("stableHash", () => {
  it("is order-independent for object keys", () => {
    expect(stableHash({ a: 1, b: 2 })).toBe(stableHash({ b: 2, a: 1 }));
  });

  it("differs for different content", () => {
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }));
  });
});
