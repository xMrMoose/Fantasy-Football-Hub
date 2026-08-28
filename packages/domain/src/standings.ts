import type { Conference, StandingsRow, Team, WeeklyMatchup } from "./types.js";

export type TiebreakKey = "win_pct" | "points_for" | "point_diff" | "team_id";

export const DEFAULT_TIEBREAK_ORDER: TiebreakKey[] = ["win_pct", "points_for", "point_diff", "team_id"];

interface TeamRecord {
  teamId: string;
  conference: Conference;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  gamesPlayed: number;
}

/** Builds W-L-T / PF / PA per team from a list of finalized weekly matchups. Only matchups with state "final" or "overridden" count. */
export function buildRecords(teams: Team[], matchups: WeeklyMatchup[]): Map<string, TeamRecord> {
  const records = new Map<string, TeamRecord>();
  for (const team of teams) {
    records.set(team.teamId, {
      teamId: team.teamId,
      conference: team.conference,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      gamesPlayed: 0,
    });
  }

  for (const m of matchups) {
    if (m.state !== "final" && m.state !== "overridden") continue;
    if (!m.teamB.teamId) continue; // bye week, no opponent
    applyResult(records, m.teamA.teamId, m.teamB.teamId, m.teamA.customPoints ?? m.teamA.points, m.teamB.customPoints ?? m.teamB.points);
    applyResult(records, m.teamB.teamId, m.teamA.teamId, m.teamB.customPoints ?? m.teamB.points, m.teamA.customPoints ?? m.teamA.points);
  }

  return records;
}

function applyResult(
  records: Map<string, TeamRecord>,
  teamId: string,
  opponentTeamId: string,
  ownPoints: number | null,
  opponentPoints: number | null,
) {
  const rec = records.get(teamId);
  if (!rec || ownPoints === null || opponentPoints === null) return;
  rec.pointsFor += ownPoints;
  rec.pointsAgainst += opponentPoints;
  rec.gamesPlayed += 1;
  if (ownPoints > opponentPoints) rec.wins += 1;
  else if (ownPoints < opponentPoints) rec.losses += 1;
  else rec.ties += 1;
}

function winPct(rec: TeamRecord): number {
  if (rec.gamesPlayed === 0) return 0;
  return (rec.wins + 0.5 * rec.ties) / rec.gamesPlayed;
}

function compareByTiebreaks(a: TeamRecord, b: TeamRecord, order: TiebreakKey[]): number {
  for (const key of order) {
    let diff = 0;
    switch (key) {
      case "win_pct":
        diff = winPct(b) - winPct(a);
        break;
      case "points_for":
        diff = b.pointsFor - a.pointsFor;
        break;
      case "point_diff":
        diff = b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst);
        break;
      case "team_id":
        diff = a.teamId.localeCompare(b.teamId);
        break;
    }
    if (diff !== 0) return diff;
  }
  return 0;
}

function toRow(rec: TeamRecord, rank: number): StandingsRow {
  return {
    teamId: rec.teamId,
    conference: rec.conference,
    rank,
    wins: rec.wins,
    losses: rec.losses,
    ties: rec.ties,
    winPct: winPct(rec),
    pointsFor: round2(rec.pointsFor),
    pointsAgainst: round2(rec.pointsAgainst),
    pointDiff: round2(rec.pointsFor - rec.pointsAgainst),
    gamesPlayed: rec.gamesPlayed,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function rankTeams(records: TeamRecord[], order: TiebreakKey[] = DEFAULT_TIEBREAK_ORDER): StandingsRow[] {
  const sorted = [...records].sort((a, b) => compareByTiebreaks(a, b, order));
  return sorted.map((rec, i) => toRow(rec, i + 1));
}

export function computeStandings(
  teams: Team[],
  matchups: WeeklyMatchup[],
  tiebreakOrder: TiebreakKey[] = DEFAULT_TIEBREAK_ORDER,
): { combined: StandingsRow[]; afc: StandingsRow[]; nfc: StandingsRow[] } {
  const records = [...buildRecords(teams, matchups).values()];
  const afcRecords = records.filter((r) => r.conference === "AFC");
  const nfcRecords = records.filter((r) => r.conference === "NFC");
  return {
    combined: rankTeams(records, tiebreakOrder),
    afc: rankTeams(afcRecords, tiebreakOrder),
    nfc: rankTeams(nfcRecords, tiebreakOrder),
  };
}
