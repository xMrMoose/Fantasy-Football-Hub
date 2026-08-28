import { z } from "zod";

// Schemas are intentionally permissive: unknown/extra fields are preserved
// (not stripped) via .passthrough(), and only the fields this project depends
// on are validated strictly. This matches the brief's "treat API schema as
// externally controlled: validate at ingestion, log unknown/missing fields
// without crashing" rule.

export const SleeperLeagueSchema = z
  .object({
    league_id: z.string(),
    name: z.string(),
    season: z.string(),
    status: z.string(),
    previous_league_id: z.string().nullable().optional(),
    roster_positions: z.array(z.string()),
    scoring_settings: z.record(z.string(), z.number()).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type SleeperLeague = z.infer<typeof SleeperLeagueSchema>;

export const SleeperRosterSchema = z
  .object({
    roster_id: z.number(),
    owner_id: z.string().nullable(),
    co_owners: z.array(z.string()).nullable().optional(),
    players: z.array(z.string()).nullable().optional(),
    starters: z.array(z.string()).nullable().optional(),
    settings: z
      .object({
        wins: z.number().optional(),
        losses: z.number().optional(),
        ties: z.number().optional(),
        fpts: z.number().optional(),
        fpts_decimal: z.number().optional(),
        fpts_against: z.number().optional(),
        fpts_against_decimal: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type SleeperRoster = z.infer<typeof SleeperRosterSchema>;

export const SleeperUserSchema = z
  .object({
    user_id: z.string(),
    display_name: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();
export type SleeperUser = z.infer<typeof SleeperUserSchema>;

export const SleeperMatchupEntrySchema = z
  .object({
    roster_id: z.number(),
    matchup_id: z.number().nullable(),
    points: z.number().nullable().optional(),
    custom_points: z.number().nullable().optional(),
    starters: z.array(z.string()).nullable().optional(),
    players: z.array(z.string()).nullable().optional(),
    players_points: z.record(z.string(), z.number()).nullable().optional(),
    starters_points: z.array(z.number()).nullable().optional(),
  })
  .passthrough();
export type SleeperMatchupEntry = z.infer<typeof SleeperMatchupEntrySchema>;

export const SleeperMatchupsResponseSchema = z.array(SleeperMatchupEntrySchema);

export const SleeperBracketMatchupSchema = z
  .object({
    r: z.number(),
    m: z.number(),
    t1: z.union([z.number(), z.string()]).nullable(),
    t2: z.union([z.number(), z.string()]).nullable(),
    w: z.number().nullable().optional(),
    l: z.number().nullable().optional(),
    t1_from: z.record(z.string(), z.unknown()).nullable().optional(),
    t2_from: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();
export const SleeperBracketResponseSchema = z.array(SleeperBracketMatchupSchema);

export const SleeperNflStateSchema = z
  .object({
    week: z.number(),
    season: z.string(),
    season_type: z.string(),
    display_week: z.number().optional(),
  })
  .passthrough();
export type SleeperNflState = z.infer<typeof SleeperNflStateSchema>;

export const SleeperPlayerSchema = z
  .object({
    player_id: z.string().optional(),
    full_name: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    team: z.string().nullable().optional(),
    position: z.string().nullable().optional(),
    fantasy_positions: z.array(z.string()).nullable().optional(),
    status: z.string().nullable().optional(),
    injury_status: z.string().nullable().optional(),
  })
  .passthrough();
export type SleeperPlayer = z.infer<typeof SleeperPlayerSchema>;

/** Full players/nfl payload: a record keyed by player_id. */
export const SleeperPlayersResponseSchema = z.record(z.string(), SleeperPlayerSchema);

/**
 * One entry from the undocumented projections endpoint. Only the fields this
 * project reads are declared; `stats` is a loose numeric record because its
 * keys vary by position (`pts_ppr`, `pts_allow`, `rec_yd`, …).
 */
export const SleeperProjectionSchema = z
  .object({
    player_id: z.string(),
    week: z.number().optional(),
    season: z.string().optional(),
    stats: z.record(z.string(), z.number()).nullable().optional(),
  })
  .passthrough();
export type SleeperProjection = z.infer<typeof SleeperProjectionSchema>;

export const SleeperProjectionsResponseSchema = SleeperProjectionSchema.array();
