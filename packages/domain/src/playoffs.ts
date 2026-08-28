import type {
  Conference,
  PlayoffBracket,
  PlayoffMatchup,
  PlayoffParticipant,
  PlayoffSeed,
  PlayoffSeeds,
  StandingsRow,
  WeeklyMatchup,
} from "./types.js";

export type PlayoffTieRule = "bench_points" | "higher_seed" | "commissioner_decision";

/** Playoff seeding uses the standings' own rank order, taking the top N (default 6). Not the same as the presentation-order default in StandingsService — commissioners may configure a different seeding rule via divisions/head-to-head elsewhere; this is the MVP default. */
export function seedFromStandings(
  conferenceStandings: StandingsRow[],
  season: string,
  rulesVersion: string,
  teamCount = 6,
  lockedAt: string | null = null,
): PlayoffSeeds {
  const conference: Conference = conferenceStandings[0]?.conference ?? "AFC";
  const seeds: PlayoffSeed[] = conferenceStandings.slice(0, teamCount).map((row, i) => ({
    seed: i + 1,
    teamId: row.teamId,
    source: "auto",
  }));
  return { season, conference, rulesVersion, lockedAt, seeds };
}

/** Week 14: seeds 1-2 bye, 3v6, 4v5. */
export function buildWildcardRound(seeds: PlayoffSeeds, week: number): PlayoffMatchup[] {
  const byId = new Map(seeds.seeds.map((s) => [s.seed, s.teamId]));
  const bye = (seed: number): PlayoffParticipant => ({ seed, teamId: byId.get(seed) ?? null, score: null, source: "bye" });
  const entrant = (seed: number): PlayoffParticipant => ({ seed, teamId: byId.get(seed) ?? null, score: null, source: "auto" });

  return [
    {
      round: "wildcard",
      week,
      conference: seeds.conference,
      participants: [bye(1)],
      winnerTeamId: byId.get(1) ?? null,
      state: "scheduled",
      provenance: "auto",
    },
    {
      round: "wildcard",
      week,
      conference: seeds.conference,
      participants: [bye(2)],
      winnerTeamId: byId.get(2) ?? null,
      state: "scheduled",
      provenance: "auto",
    },
    {
      round: "wildcard",
      week,
      conference: seeds.conference,
      participants: [entrant(3), entrant(6)],
      winnerTeamId: null,
      state: "scheduled",
      provenance: "auto",
    },
    {
      round: "wildcard",
      week,
      conference: seeds.conference,
      participants: [entrant(4), entrant(5)],
      winnerTeamId: null,
      state: "scheduled",
      provenance: "auto",
    },
  ];
}

/**
 * Week 15 semifinals. If reseed=true (default), seed 1 plays the lowest
 * remaining seed and seed 2 plays the other remaining seed. If reseed=false,
 * a fixed bracket is used: 1 plays winner of (4v5), 2 plays winner of (3v6).
 * Both branches require the wildcard round to be fully final first (caller's
 * responsibility — this function assumes winners are already resolved).
 */
export function buildSemifinalRound(
  wildcardRound: PlayoffMatchup[],
  week: number,
  reseed: boolean,
): PlayoffMatchup[] | null {
  const byeWinners = wildcardRound.filter((m) => m.participants.length === 1).map((m) => m.winnerTeamId);
  const threeSixWinner = wildcardRound.find((m) => m.participants.some((p) => p.seed === 3))?.winnerTeamId ?? null;
  const fourFiveWinner = wildcardRound.find((m) => m.participants.some((p) => p.seed === 4))?.winnerTeamId ?? null;

  if (byeWinners.some((w) => !w) || !threeSixWinner || !fourFiveWinner) return null;

  const seedOf = (matchup: PlayoffMatchup | undefined, teamId: string | null) =>
    matchup?.participants.find((p) => p.teamId === teamId)?.seed ?? null;

  const threeSixMatchup = wildcardRound.find((m) => m.participants.some((p) => p.seed === 3));
  const fourFiveMatchup = wildcardRound.find((m) => m.participants.some((p) => p.seed === 4));

  const seed1 = byeWinners[0] as string;
  const seed2 = byeWinners[1] as string;
  const conference = wildcardRound[0].conference;

  if (reseed) {
    const threeSixSeed = seedOf(threeSixMatchup, threeSixWinner) ?? 99;
    const fourFiveSeed = seedOf(fourFiveMatchup, fourFiveWinner) ?? 99;
    const lowest = threeSixSeed > fourFiveSeed ? threeSixWinner : fourFiveWinner;
    const other = threeSixSeed > fourFiveSeed ? fourFiveWinner : threeSixWinner;
    return [
      {
        round: "semifinal",
        week,
        conference,
        participants: [
          { seed: 1, teamId: seed1, score: null, source: "auto" },
          { seed: seedOf(threeSixMatchup, lowest) ?? seedOf(fourFiveMatchup, lowest), teamId: lowest, score: null, source: "auto" },
        ],
        winnerTeamId: null,
        state: "scheduled",
        provenance: "auto",
      },
      {
        round: "semifinal",
        week,
        conference,
        participants: [
          { seed: 2, teamId: seed2, score: null, source: "auto" },
          { seed: seedOf(threeSixMatchup, other) ?? seedOf(fourFiveMatchup, other), teamId: other, score: null, source: "auto" },
        ],
        winnerTeamId: null,
        state: "scheduled",
        provenance: "auto",
      },
    ];
  }

  // Fixed bracket: 1 vs (4v5 winner), 2 vs (3v6 winner).
  return [
    {
      round: "semifinal",
      week,
      conference,
      participants: [
        { seed: 1, teamId: seed1, score: null, source: "auto" },
        { seed: seedOf(fourFiveMatchup, fourFiveWinner), teamId: fourFiveWinner, score: null, source: "auto" },
      ],
      winnerTeamId: null,
      state: "scheduled",
      provenance: "auto",
    },
    {
      round: "semifinal",
      week,
      conference,
      participants: [
        { seed: 2, teamId: seed2, score: null, source: "auto" },
        { seed: seedOf(threeSixMatchup, threeSixWinner), teamId: threeSixWinner, score: null, source: "auto" },
      ],
      winnerTeamId: null,
      state: "scheduled",
      provenance: "auto",
    },
  ];
}

export function buildChampionshipRound(
  semifinalRound: PlayoffMatchup[],
  week: number,
): PlayoffMatchup | null {
  const winners = semifinalRound.map((m) => m.winnerTeamId);
  if (winners.some((w) => !w)) return null;
  const conference = semifinalRound[0].conference;
  return {
    round: "championship",
    week,
    conference,
    participants: semifinalRound.flatMap((m) =>
      m.participants.filter((p) => p.teamId === m.winnerTeamId),
    ),
    winnerTeamId: null,
    state: "scheduled",
    provenance: "auto",
  };
}

/**
 * Determines a matchup's winner from finalized scores. Ties are NOT resolved
 * here — the caller must supply a resolved tie via override when
 * matchup.state should become "final"; otherwise state stays "tied".
 */
export function resolveWinner(matchup: PlayoffMatchup): string | null {
  if (matchup.participants.length === 1) return matchup.participants[0].teamId;
  const [p1, p2] = matchup.participants;
  if (p1.score === null || p2.score === null) return null;
  if (p1.score === p2.score) return null; // requires explicit tie-rule application, never guessed
  return p1.score > p2.score ? p1.teamId : p2.teamId;
}

export function buildBracket(
  seeds: PlayoffSeeds,
  weeks: { wildcard: number; semifinal: number; championship: number },
  reseed: boolean,
): PlayoffBracket {
  const wildcard = buildWildcardRound(seeds, weeks.wildcard);
  const semifinal = buildSemifinalRound(wildcard, weeks.semifinal, reseed) ?? [];
  const championship = buildChampionshipRound(semifinal, weeks.championship);
  return {
    season: seeds.season,
    conference: seeds.conference,
    reseed,
    matchups: [...wildcard, ...semifinal, ...(championship ? [championship] : [])],
  };
}
