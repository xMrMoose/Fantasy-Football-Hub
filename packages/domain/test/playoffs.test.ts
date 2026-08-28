import { describe, it, expect } from "vitest";
import { buildWildcardRound, buildSemifinalRound, buildChampionshipRound, buildBracket, resolveWinner } from "../src/playoffs.js";
import type { PlayoffSeeds } from "../src/types.js";

function seeds(): PlayoffSeeds {
  return {
    season: "2026",
    conference: "AFC",
    rulesVersion: "v1",
    lockedAt: "2026-12-01T00:00:00Z",
    seeds: [1, 2, 3, 4, 5, 6].map((seed) => ({ seed, teamId: `AFC-${seed}`, source: "auto" as const })),
  };
}

function finalizeWinner(matchup: ReturnType<typeof buildWildcardRound>[number], winnerTeamId: string) {
  return { ...matchup, winnerTeamId, state: "final" as const, participants: matchup.participants.map((p) => ({ ...p, score: p.teamId === winnerTeamId ? 100 : 80 })) };
}

describe("playoff bracket", () => {
  it("gives seeds 1 and 2 byes in the wildcard round", () => {
    const round = buildWildcardRound(seeds(), 14);
    expect(round.find((m) => m.participants[0].seed === 1)?.winnerTeamId).toBe("AFC-1");
    expect(round.find((m) => m.participants[0].seed === 2)?.winnerTeamId).toBe("AFC-2");
    expect(round.find((m) => m.participants.some((p) => p.seed === 3))?.participants.map((p) => p.seed)).toEqual([3, 6]);
    expect(round.find((m) => m.participants.some((p) => p.seed === 4))?.participants.map((p) => p.seed)).toEqual([4, 5]);
  });

  it("returns null for semifinals until the wildcard round is complete", () => {
    const round = buildWildcardRound(seeds(), 14);
    expect(buildSemifinalRound(round, 15, true)).toBeNull();
  });

  it("reseeds so seed 1 plays the lowest remaining seed", () => {
    const wildcard = buildWildcardRound(seeds(), 14).map((m) => {
      if (m.participants.some((p) => p.seed === 3)) return finalizeWinner(m, "AFC-6"); // upset: 6 beats 3
      if (m.participants.some((p) => p.seed === 4)) return finalizeWinner(m, "AFC-4");
      return m;
    });
    const semis = buildSemifinalRound(wildcard, 15, true)!;
    const seed1Matchup = semis.find((m) => m.participants.some((p) => p.seed === 1))!;
    // remaining seeds are 6 and 4; lowest (highest number) is 6, so seed 1 plays seed 6
    expect(seed1Matchup.participants.map((p) => p.teamId)).toContain("AFC-6");
  });

  it("uses a fixed bracket when reseed=false", () => {
    const wildcard = buildWildcardRound(seeds(), 14).map((m) => {
      if (m.participants.some((p) => p.seed === 3)) return finalizeWinner(m, "AFC-3");
      if (m.participants.some((p) => p.seed === 4)) return finalizeWinner(m, "AFC-5"); // upset: 5 beats 4
      return m;
    });
    const semis = buildSemifinalRound(wildcard, 15, false)!;
    const seed1Matchup = semis.find((m) => m.participants.some((p) => p.seed === 1))!;
    // fixed: 1 always plays winner of 4v5 regardless of seed
    expect(seed1Matchup.participants.map((p) => p.teamId)).toContain("AFC-5");
  });

  it("does not guess a winner on a tie", () => {
    const matchup = {
      round: "wildcard" as const,
      week: 14,
      conference: "AFC" as const,
      participants: [
        { seed: 3, teamId: "AFC-3", score: 100, source: "auto" as const },
        { seed: 6, teamId: "AFC-6", score: 100, source: "auto" as const },
      ],
      winnerTeamId: null,
      state: "scheduled" as const,
      provenance: "auto" as const,
    };
    expect(resolveWinner(matchup)).toBeNull();
  });

  it("does not crash when semifinals haven't been built yet (e.g. wildcard round unresolved)", () => {
    expect(buildChampionshipRound([], 16)).toBeNull();
  });

  it("buildBracket never throws even when no wildcard results exist yet (e.g. week 0/preseason)", () => {
    expect(() => buildBracket(seeds(), { wildcard: 0, semifinal: 1, championship: 2 }, false)).not.toThrow();
    expect(() => buildBracket(seeds(), { wildcard: 0, semifinal: 1, championship: 2 }, true)).not.toThrow();
  });

  it("builds a championship only once both semifinals have winners", () => {
    const wildcard = buildWildcardRound(seeds(), 14).map((m) => {
      if (m.participants.some((p) => p.seed === 3)) return finalizeWinner(m, "AFC-3");
      if (m.participants.some((p) => p.seed === 4)) return finalizeWinner(m, "AFC-4");
      return m;
    });
    const semis = buildSemifinalRound(wildcard, 15, true)!;
    expect(buildChampionshipRound(semis, 16)).toBeNull();
    const finishedSemis = semis.map((m) => finalizeWinner(m, m.participants[0].teamId!));
    const championship = buildChampionshipRound(finishedSemis, 16);
    expect(championship).not.toBeNull();
    expect(championship!.participants).toHaveLength(2);
  });
});
