import {
  SleeperLeagueSchema,
  SleeperRosterSchema,
  SleeperUserSchema,
  SleeperMatchupsResponseSchema,
  SleeperBracketResponseSchema,
  SleeperNflStateSchema,
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

/** Fetches everything needed for one conference's league, for weeks 1..upToWeek. Validates each response at the boundary; throws on transport failure (caller decides how to degrade). */
export async function fetchLeaguePayload(
  client: SleeperClient,
  leagueId: string,
  upToWeek: number,
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
  for (let week = 1; week <= upToWeek; week++) {
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

/** Fetches the full player directory and trims it to only the given player IDs (keeps the committed file small and diff-friendly). */
export async function fetchTrimmedPlayers(client: SleeperClient, rosteredPlayerIds: Set<string>) {
  const raw = (await client.get("/players/nfl")) as Record<string, unknown>;
  const trimmed: Record<string, unknown> = {};
  for (const id of rosteredPlayerIds) {
    if (raw[id]) trimmed[id] = raw[id];
  }
  return trimmed;
}
