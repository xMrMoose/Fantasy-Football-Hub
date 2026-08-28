import { describe, it, expect } from "vitest";
import {
  combinePoints,
  pairMatchups,
  normalizeTeams,
  stableHash,
  buildRosterSlots,
  scoringVariant,
  projectionPointsKey,
} from "../src/normalize.js";
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

describe("buildRosterSlots", () => {
  const positions = ["QB", "RB", "RB", "FLEX", "BN", "BN"];

  it("returns all-empty seats in template order for an undrafted roster", () => {
    const slots = buildRosterSlots(positions, [], []);
    expect(slots.map((s) => s.slot)).toEqual(positions);
    expect(slots.every((s) => s.playerId === null)).toBe(true);
    expect(slots.filter((s) => s.starter)).toHaveLength(4);
  });

  it("aligns starters positionally with the starting seats", () => {
    const slots = buildRosterSlots(positions, ["p1", "p2", "p3", "p4"], ["p1", "p2", "p3", "p4"]);
    expect(slots.slice(0, 4).map((s) => [s.slot, s.playerId])).toEqual([
      ["QB", "p1"],
      ["RB", "p2"],
      ["RB", "p3"],
      ["FLEX", "p4"],
    ]);
  });

  it('treats Sleeper\'s "0" placeholder as an empty seat, not a player', () => {
    const slots = buildRosterSlots(positions, ["p1", "0", "p3", "0"], ["p1", "p3"]);
    expect(slots.map((s) => s.playerId)).toEqual(["p1", null, "p3", null, null, null]);
  });

  it("fills bench seats with rostered players who are not starting", () => {
    const slots = buildRosterSlots(positions, ["p1", "p2", "p3", "p4"], ["p1", "p2", "p3", "p4", "p5"]);
    expect(slots[4]).toEqual({ slot: "BN", starter: false, playerId: "p5" });
    expect(slots[5]).toEqual({ slot: "BN", starter: false, playerId: null });
  });

  it("appends overflow seats rather than dropping extra players", () => {
    const slots = buildRosterSlots(["QB", "BN"], ["p1"], ["p1", "p2", "p3", "p4"]);
    expect(slots).toHaveLength(4);
    expect(slots.slice(1).map((s) => s.playerId)).toEqual(["p2", "p3", "p4"]);
    expect(slots.slice(1).every((s) => s.slot === "BN" && !s.starter)).toBe(true);
  });

  it("fills IR/taxi seats from the bench pool without marking them starters", () => {
    const slots = buildRosterSlots(["QB", "IR"], ["p1"], ["p1", "p2"]);
    expect(slots[1]).toEqual({ slot: "IR", starter: false, playerId: "p2" });
  });
});

describe("scoringVariant", () => {
  it("maps a full point per reception to PPR", () => {
    expect(scoringVariant({ rec: 1 })).toBe("ppr");
  });

  it("maps a half point per reception to half PPR", () => {
    expect(scoringVariant({ rec: 0.5 })).toBe("half_ppr");
  });

  it("falls back to standard when receptions score nothing", () => {
    expect(scoringVariant({ rec: 0 })).toBe("std");
    expect(scoringVariant({})).toBe("std");
    expect(scoringVariant(undefined)).toBe("std");
  });

  it("builds the matching Sleeper stats key", () => {
    expect(projectionPointsKey(scoringVariant({ rec: 1 }))).toBe("pts_ppr");
    expect(projectionPointsKey(scoringVariant({ rec: 0.5 }))).toBe("pts_half_ppr");
    expect(projectionPointsKey(scoringVariant({}))).toBe("pts_std");
  });
});
