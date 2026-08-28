import type {
  SleeperLeague,
  SleeperRoster,
  SleeperUser,
  SleeperMatchupEntry,
} from "./sleeperSchemas.js";
import type {
  Conference,
  SourceLeague,
  Team,
  WeeklyMatchup,
  TeamMatchupSide,
  PlayerLineupEntry,
  RosterSlot,
  TeamRoster,
} from "./types.js";

/** Deterministic hash of an object's JSON representation (for scoring-settings parity checks and raw-payload traceability). Not cryptographic — just stable and cheap. */
export function stableHash(value: unknown): string {
  const json = JSON.stringify(sortKeysDeep(value));
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = (Math.imul(31, hash) + json.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function normalizeSourceLeague(
  raw: SleeperLeague,
  conference: Conference,
  validatedAt: string,
): SourceLeague {
  return {
    season: raw.season,
    conference,
    sleeperLeagueId: raw.league_id,
    status: raw.status,
    rosterPositions: raw.roster_positions,
    scoringSettingsHash: stableHash(raw.scoring_settings ?? {}),
    previousLeagueId: raw.previous_league_id ?? null,
    lastValidatedAt: validatedAt,
  };
}

export function teamId(conference: Conference, sourceRosterId: number): string {
  return `${conference}-${sourceRosterId}`;
}

export function matchupId(conference: Conference, sleeperMatchupId: number): string {
  return `${conference}-${sleeperMatchupId}`;
}

export function normalizeTeams(
  rosters: SleeperRoster[],
  users: SleeperUser[],
  conference: Conference,
  sourceLeagueId: string,
  season: string,
): Team[] {
  const usersById = new Map(users.map((u) => [u.user_id, u]));
  return rosters.map((roster) => {
    const owner = roster.owner_id ? usersById.get(roster.owner_id) : undefined;
    const metadataName = owner?.metadata?.team_name;
    return {
      teamId: teamId(conference, roster.roster_id),
      season,
      conference,
      sourceLeagueId,
      sourceRosterId: roster.roster_id,
      ownerId: roster.owner_id,
      displayName:
        typeof metadataName === "string" && metadataName.length > 0
          ? metadataName
          : owner?.display_name ?? `Team ${roster.roster_id}`,
      ownerDisplayName: owner?.display_name ?? null,
      avatar: owner?.avatar ?? null,
    };
  });
}

export type ScoringVariant = "ppr" | "half_ppr" | "std";

/**
 * Which of Sleeper's three pre-computed projection totals matches this league.
 * Sleeper publishes projections as `pts_ppr` / `pts_half_ppr` / `pts_std`
 * rather than applying a league's own scoring, so the closest match is chosen
 * from the per-reception value: 1.0 = PPR, 0.5 = half, anything else standard.
 * Leagues that differ from the base formats elsewhere will be approximate —
 * these are projections, not scores.
 */
export function scoringVariant(scoringSettings: Record<string, number> | undefined): ScoringVariant {
  const rec = scoringSettings?.rec ?? 0;
  if (rec >= 1) return "ppr";
  if (rec >= 0.5) return "half_ppr";
  return "std";
}

/** The stats key on a Sleeper projection entry holding that variant's point total. */
export function projectionPointsKey(variant: ScoringVariant): string {
  return `pts_${variant}`;
}

/** Roster seats that hold a player but never count toward the starting lineup. */
const NON_STARTING_SLOTS = new Set(["BN", "IR", "TAXI"]);

/**
 * Expands a league's `roster_positions` template into ordered, labelled seats
 * and fills them from a Sleeper roster.
 *
 * Sleeper's `starters` array is positionally aligned with the *starting* entries
 * of `roster_positions` (bench seats are not represented there), and unfilled
 * seats are the literal string "0". Bench/IR seats are filled from whatever is
 * on `players` but not starting. Any players beyond the configured seat count
 * get appended as extra "BN" seats so a roster never silently hides a player.
 */
export function buildRosterSlots(
  rosterPositions: string[],
  starters: string[] | null | undefined,
  players: string[] | null | undefined,
): RosterSlot[] {
  const starterList = starters ?? [];
  const startingIds = new Set(starterList.filter((id) => id !== "0"));
  const benchPool = (players ?? []).filter((id) => id !== "0" && !startingIds.has(id));

  let starterIndex = 0;
  let benchIndex = 0;

  const slots: RosterSlot[] = rosterPositions.map((position) => {
    if (NON_STARTING_SLOTS.has(position)) {
      return { slot: position, starter: false, playerId: benchPool[benchIndex++] ?? null };
    }
    const id = starterList[starterIndex++];
    return { slot: position, starter: true, playerId: id && id !== "0" ? id : null };
  });

  for (; benchIndex < benchPool.length; benchIndex++) {
    slots.push({ slot: "BN", starter: false, playerId: benchPool[benchIndex] });
  }

  return slots;
}

export function normalizeRosters(
  rosters: SleeperRoster[],
  rosterPositions: string[],
  conference: Conference,
  season: string,
): TeamRoster[] {
  return rosters.map((roster) => ({
    teamId: teamId(conference, roster.roster_id),
    season,
    conference,
    sourceRosterId: roster.roster_id,
    slots: buildRosterSlots(rosterPositions, roster.starters, roster.players),
    playerIds: (roster.players ?? []).filter((id) => id !== "0"),
  }));
}

/** Combines Sleeper's whole/decimal point fields. Preserves null (unknown) rather than coercing to 0. */
export function combinePoints(whole: number | undefined, decimal: number | undefined): number | null {
  if (whole === undefined && decimal === undefined) return null;
  return (whole ?? 0) + (decimal ?? 0) / 100;
}

function toLineup(
  starters: string[] | null | undefined,
  players: string[] | null | undefined,
  playersPoints: Record<string, number> | null | undefined,
  startersPoints: number[] | null | undefined,
): PlayerLineupEntry[] {
  const starterSet = new Set(starters ?? []);
  const startersPointsByPlayer = new Map<string, number>();
  if (starters && startersPoints) {
    starters.forEach((playerId, i) => {
      if (startersPoints[i] !== undefined) startersPointsByPlayer.set(playerId, startersPoints[i]);
    });
  }
  // Sleeper fills unset starter slots with the literal string "0" (e.g. before
  // a draft has happened) — that's a placeholder for "empty slot", not a player.
  const allPlayerIds = (players && players.length > 0 ? players : starters ?? []).filter((id) => id !== "0");
  return allPlayerIds.map((playerId) => ({
    playerId,
    slot: starterSet.has(playerId) ? "starter" : "bench",
    starter: starterSet.has(playerId),
    points: playersPoints?.[playerId] ?? startersPointsByPlayer.get(playerId) ?? null,
    status: null,
  }));
}

/**
 * Pairs raw matchup entries by matchup_id into WeeklyMatchup records.
 * Handles missing matchup_id (bye week — no opponent), and guards against
 * more/fewer than two entries sharing an id by only using the first two and
 * flagging the rest as unpaired (caller should log a warning).
 */
export function pairMatchups(
  entries: SleeperMatchupEntry[],
  conference: Conference,
  sourceLeagueId: string,
  week: number,
): { matchups: WeeklyMatchup[]; unpaired: SleeperMatchupEntry[]; overCrowded: number[] } {
  const byId = new Map<number, SleeperMatchupEntry[]>();
  const unpaired: SleeperMatchupEntry[] = [];

  for (const entry of entries) {
    if (entry.matchup_id === null || entry.matchup_id === undefined) {
      unpaired.push(entry);
      continue;
    }
    const group = byId.get(entry.matchup_id) ?? [];
    group.push(entry);
    byId.set(entry.matchup_id, group);
  }

  const matchups: WeeklyMatchup[] = [];
  const overCrowded: number[] = [];

  for (const [sleeperMatchupId, group] of byId) {
    if (group.length > 2) overCrowded.push(sleeperMatchupId);
    const [a, b] = group;
    const teamASide = toSide(a, conference);
    const teamBSide = b ? toSide(b, conference) : null;

    if (!teamBSide) {
      // Bye week / unmatched single entry.
      matchups.push({
        matchupId: matchupId(conference, sleeperMatchupId),
        conference,
        sourceLeagueId,
        week,
        state: "scheduled",
        teamA: teamASide,
        teamB: { teamId: "", points: null, customPoints: null, lineup: [] },
        winnerTeamId: null,
        customPointsUsed: teamASide.customPoints !== null,
      });
      continue;
    }

    const winnerTeamId = determineWinner(teamASide, teamBSide);
    matchups.push({
      matchupId: matchupId(conference, sleeperMatchupId),
      conference,
      sourceLeagueId,
      week,
      state: "scheduled",
      teamA: teamASide,
      teamB: teamBSide,
      winnerTeamId,
      customPointsUsed: teamASide.customPoints !== null || teamBSide.customPoints !== null,
    });
  }

  return { matchups, unpaired, overCrowded };
}

function toSide(entry: SleeperMatchupEntry, conference: Conference): TeamMatchupSide {
  return {
    teamId: teamId(conference, entry.roster_id),
    points: entry.points ?? null,
    customPoints: entry.custom_points ?? null,
    lineup: toLineup(entry.starters, entry.players, entry.players_points, entry.starters_points),
  };
}

/** Never infer a winner from partial data — only from two present, non-null point totals. */
function determineWinner(a: TeamMatchupSide, b: TeamMatchupSide): string | null {
  const aPoints = a.customPoints ?? a.points;
  const bPoints = b.customPoints ?? b.points;
  if (aPoints === null || bPoints === null) return null;
  if (aPoints === bPoints) return null; // tie — resolved by playoff/tie rules elsewhere, not here
  return aPoints > bPoints ? a.teamId : b.teamId;
}
