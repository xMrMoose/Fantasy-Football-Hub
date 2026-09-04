import {
  SleeperLeagueSchema,
  SleeperRosterSchema,
  SleeperUserSchema,
  SleeperMatchupsResponseSchema,
  SleeperBracketResponseSchema,
  SleeperNflStateSchema,
  SleeperProjectionsResponseSchema,
  type SleeperLeague,
  type SleeperRoster,
  type SleeperUser,
  type SleeperMatchupEntry,
} from "@fantasy/domain";
import type { SleeperClient } from "./sleeperClient.js";

export interface LeaguePayload {
  league: SleeperLeague;
  rosters: SleeperRoster[];
  users: SleeperUser[];
  matchupsByWeek: Record<number, SleeperMatchupEntry[]>;
  winnersBracket: unknown[];
  losersBracket: unknown[];
}

/**
 * Fetches everything needed for one conference's league, for weeks 1..maxWeek.
 * Sleeper publishes the full-season schedule (matchup pairings) up front, with
 * points sitting at 0 until a week is actually played, so `maxWeek` is
 * typically the last regular-season week rather than the currently active
 * one — callers want the whole schedule visible, not just weeks played so far.
 * Validates each response at the boundary; throws on transport failure
 * (caller decides how to degrade).
 */
export async function fetchLeaguePayload(
  client: SleeperClient,
  leagueId: string,
  maxWeek: number,
): Promise<LeaguePayload> {
  const [leagueRaw, rostersRaw, usersRaw] = await Promise.all([
    client.get(`/league/${leagueId}`),
    client.get(`/league/${leagueId}/rosters`),
    client.get(`/league/${leagueId}/users`),
  ]);

  const league = SleeperLeagueSchema.parse(leagueRaw);
  const rosters = SleeperRosterSchema.array().parse(rostersRaw);
  const users = SleeperUserSchema.array().parse(usersRaw);

  const matchupsByWeek: Record<number, SleeperMatchupEntry[]> = {};
  for (let week = 1; week <= maxWeek; week++) {
    const raw = await client.get(`/league/${leagueId}/matchups/${week}`);
    matchupsByWeek[week] = SleeperMatchupsResponseSchema.parse(raw);
  }

  const [winnersRaw, losersRaw] = await Promise.all([
    client.get(`/league/${leagueId}/winners_bracket`).catch(() => []),
    client.get(`/league/${leagueId}/losers_bracket`).catch(() => []),
  ]);

  return {
    league,
    rosters,
    users,
    matchupsByWeek,
    winnersBracket: SleeperBracketResponseSchema.catch([]).parse(winnersRaw),
    losersBracket: SleeperBracketResponseSchema.catch([]).parse(losersRaw),
  };
}

export async function fetchNflState(client: SleeperClient) {
  const raw = await client.get("/state/nfl");
  return SleeperNflStateSchema.parse(raw);
}

/** Positions worth projecting — everything this league can start. */
const PROJECTION_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

/**
 * Fetches one week of player projections, trimmed to rostered players.
 *
 * Unlike everything else here this hits Sleeper's *undocumented* projections
 * host (`api.sleeper.com/projections`, no `/v1`), which is not part of their
 * published read-only API and may change without notice. Callers must treat a
 * failure as non-fatal — the site renders "—" for projections when the file is
 * missing, which is strictly better than failing a sync over a nice-to-have.
 */
export async function fetchProjections(
  client: SleeperClient,
  season: string,
  week: number,
  pointsKey: string,
  rosteredPlayerIds: Set<string>,
): Promise<Record<string, number>> {
  const positions = PROJECTION_POSITIONS.map((p) => `position[]=${p}`).join("&");
  const raw = await client.get<unknown>(
    `/projections/nfl/${season}/${week}?season_type=regular&${positions}`,
  );
  const entries = SleeperProjectionsResponseSchema.parse(raw);

  const projections: Record<string, number> = {};
  for (const entry of entries) {
    if (!rosteredPlayerIds.has(entry.player_id)) continue;
    const points = entry.stats?.[pointsKey];
    if (typeof points === "number") projections[entry.player_id] = points;
  }
  return projections;
}

/** Fetches the full player directory and trims it to only the given player IDs (keeps the committed file small and diff-friendly). */
export async function fetchTrimmedPlayers(client: SleeperClient, rosteredPlayerIds: Set<string>) {
  const raw = (await client.get("/players/nfl")) as Record<string, unknown>;
  const trimmed: Record<string, unknown> = {};
  for (const id of rosteredPlayerIds) {
    if (raw[id]) trimmed[id] = raw[id];
  }
  return trimmed;
}
