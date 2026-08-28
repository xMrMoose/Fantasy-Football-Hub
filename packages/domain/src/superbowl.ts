import type { PlayoffBracket, SuperBowl, TeamMatchupSide, WeeklyMatchup } from "./types.js";

/** Reads the "championship" round of a finalized conference bracket to get its champion. Returns null if not yet final. */
export function resolveChampion(bracket: PlayoffBracket): string | null {
  const championship = bracket.matchups.find((m) => m.round === "championship");
  if (!championship) return null;
  if (championship.state !== "final" && championship.state !== "overridden") return null;
  return championship.winnerTeamId;
}

/**
 * Builds/updates the Week 17 Super Bowl object. Requires each champion's own
 * Week 17 matchup side (the caller must select the correct side by teamId —
 * a champion's Week 17 Sleeper matchup may include an unrelated consolation
 * opponent, whose lineup/score must NOT leak into this object).
 */
export function buildSuperBowl(
  season: string,
  week: number,
  afcChampionTeamId: string | null,
  nfcChampionTeamId: string | null,
  afcSide: TeamMatchupSide | null,
  nfcSide: TeamMatchupSide | null,
  now: string,
  scoringParityBlocked: boolean,
  previous: SuperBowl | null,
): SuperBowl {
  if (!afcChampionTeamId || !nfcChampionTeamId) {
    return (
      previous ?? {
        season,
        week,
        state: "awaiting_participant",
        afcChampionTeamId,
        nfcChampionTeamId,
        lineupSnapshot: null,
        scores: { afc: null, nfc: null },
        winnerTeamId: null,
        lastUpdated: now,
        overrideHistory: [],
        blockingReason: null,
      }
    );
  }

  if (scoringParityBlocked) {
    return {
      season,
      week,
      state: "source_incomplete",
      afcChampionTeamId,
      nfcChampionTeamId,
      lineupSnapshot: null,
      scores: { afc: null, nfc: null },
      winnerTeamId: null,
      lastUpdated: now,
      overrideHistory: previous?.overrideHistory ?? [],
      blockingReason:
        "AFC and NFC leagues have different scoring settings; no canonical Super Bowl scoring configuration has been chosen.",
    };
  }

  if (!afcSide || !nfcSide) {
    return {
      season,
      week,
      state: "source_incomplete",
      afcChampionTeamId,
      nfcChampionTeamId,
      lineupSnapshot: previous?.lineupSnapshot ?? null,
      scores: previous?.scores ?? { afc: null, nfc: null },
      winnerTeamId: null,
      lastUpdated: now,
      overrideHistory: previous?.overrideHistory ?? [],
      blockingReason: "Champion has no valid Week 17 lineup in their source league.",
    };
  }

  // Once finalized, don't let a temporarily-incomplete payload overwrite it —
  // protect finalized state (guarded below once scores are computed).
  const alreadyFinal = previous?.state === "final" || previous?.state === "overridden";

  const afcScore = afcSide.customPoints ?? afcSide.points;
  const nfcScore = nfcSide.customPoints ?? nfcSide.points;

  if (alreadyFinal && (afcScore === null || nfcScore === null)) {
    return previous as SuperBowl;
  }

  const bothScored = afcScore !== null && nfcScore !== null;
  const winnerTeamId = bothScored
    ? afcScore === nfcScore
      ? null
      : afcScore! > nfcScore!
        ? afcChampionTeamId
        : nfcChampionTeamId
    : null;

  const state = !bothScored ? "unofficial" : afcScore === nfcScore ? "tied" : "final";

  return {
    season,
    week,
    state,
    afcChampionTeamId,
    nfcChampionTeamId,
    lineupSnapshot: { afc: afcSide.lineup, nfc: nfcSide.lineup },
    scores: { afc: afcScore, nfc: nfcScore },
    winnerTeamId,
    lastUpdated: now,
    overrideHistory: previous?.overrideHistory ?? [],
    blockingReason: null,
  };
}

/** Picks a champion's own side out of their Week 17 league matchups, ignoring any consolation-bracket opponent. */
export function findChampionSide(matchups: WeeklyMatchup[], championTeamId: string): TeamMatchupSide | null {
  for (const m of matchups) {
    if (m.teamA.teamId === championTeamId) return m.teamA;
    if (m.teamB.teamId === championTeamId) return m.teamB;
  }
  return null;
}
