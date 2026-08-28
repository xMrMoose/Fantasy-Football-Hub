import { SleeperClient } from "./sleeperClient.js";
import { fetchLeaguePayload, fetchNflState, fetchTrimmedPlayers } from "./fetchAll.js";
import { readJsonIfExists, writeJson, weekFileName, paths } from "./buildDataDir.js";
import { newRunId, okResult, failedResult, appendSyncLog, summarizeRun } from "./syncRun.js";
import {
  normalizeSourceLeague,
  normalizeTeams,
  normalizeRosters,
  pairMatchups,
  stableHash,
  computeStandings,
  seedFromStandings,
  buildBracket,
  resolveChampion,
  buildSuperBowl,
  findChampionSide,
  deriveMatchupState,
  validateOverrides,
  overridesFor,
  applyOverrideField,
  DEFAULT_LEAGUE_RULES,
  type Team,
  type TeamRoster,
  type WeeklyMatchup,
  type ManualOverride,
  type SyncRunEntry,
  type SuperBowl,
  type PlayoffBracket,
  type PlayoffSeeds,
} from "@fantasy/domain";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DATA_DIR = join(ROOT, "data");
const OVERRIDES_PATH = join(ROOT, "config", "overrides.json");

// GitHub Actions sets an env var to an empty string (not unset) when the
// referenced `vars.X` was never created — `?? default` doesn't catch that,
// so treat "" the same as unset for every optional config value below.
function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

const SEASON = envOrDefault("SEASON", "2026");
const AFC_LEAGUE_ID = envOrDefault("AFC_SLEEPER_LEAGUE_ID", "");
const NFC_LEAGUE_ID = envOrDefault("NFC_SLEEPER_LEAGUE_ID", "");
const PLAYOFF_START_WEEK = Number(envOrDefault("PLAYOFF_START_WEEK", String(DEFAULT_LEAGUE_RULES.playoffStartWeek)));
const SUPER_BOWL_WEEK = Number(envOrDefault("SUPER_BOWL_WEEK", String(DEFAULT_LEAGUE_RULES.superBowlWeek)));
const PLAYOFF_RESEED = envOrDefault("PLAYOFF_RESEED", String(DEFAULT_LEAGUE_RULES.playoffReseed)) === "true";

async function main() {
  if (!AFC_LEAGUE_ID || !NFC_LEAGUE_ID) {
    console.error("AFC_SLEEPER_LEAGUE_ID and NFC_SLEEPER_LEAGUE_ID must be set (see .env.example).");
    process.exitCode = 1;
    return;
  }

  const client = new SleeperClient();
  const runId = newRunId();
  const startedAt = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];
  const weeksUpdated: number[] = [];

  const overrides = ((await readJsonIfExists<ManualOverride[]>(OVERRIDES_PATH)) ?? []).filter(
    (o) => o.appliesFromSeason <= SEASON,
  );
  validateOverrides(overrides);

  const nflState = await fetchNflState(client).catch((err) => {
    warnings.push(`Failed to fetch NFL state: ${String(err)}`);
    return { week: 1, season: SEASON, season_type: "regular" as const };
  });
  const upToWeek = Math.max(1, Math.min(17, nflState.week));

  const afc = await tryFetchLeague(client, "AFC", AFC_LEAGUE_ID, upToWeek);
  const nfc = await tryFetchLeague(client, "NFC", NFC_LEAGUE_ID, upToWeek);

  if (afc.error) errors.push(`AFC: ${afc.error}`);
  if (nfc.error) errors.push(`NFC: ${nfc.error}`);

  let allTeams: Team[] = [];
  let allRosters: TeamRoster[] = [];
  const scoringHashes: string[] = [];

  for (const side of [afc, nfc] as const) {
    if (!side.payload) continue;
    const sourceLeague = normalizeSourceLeague(side.payload.league, side.conference, startedAt);
    scoringHashes.push(sourceLeague.scoringSettingsHash);
    await writeJson(paths.sourceLeague(DATA_DIR, side.conference.toLowerCase() as "afc" | "nfc"), sourceLeague);
    const teams = normalizeTeams(side.payload.rosters, side.payload.users, side.conference, side.payload.league.league_id, SEASON);
    allTeams = allTeams.concat(teams);
    allRosters = allRosters.concat(
      normalizeRosters(side.payload.rosters, sourceLeague.rosterPositions, side.conference, SEASON),
    );
  }

  if (allTeams.length > 0) {
    await writeJson(paths.teams(DATA_DIR), allTeams);
  } else {
    allTeams = (await readJsonIfExists<Team[]>(paths.teams(DATA_DIR))) ?? [];
  }

  // Rosters are written even while every seat is still empty — the team page
  // renders the empty seats, and this is the file that fills in on draft day.
  if (allRosters.length > 0) {
    await writeJson(paths.rosters(DATA_DIR), allRosters);
  }

  const scoringParityMismatch = scoringHashes.length === 2 && scoringHashes[0] !== scoringHashes[1];
  if (scoringParityMismatch) {
    warnings.push("AFC and NFC scoring settings differ — combined point comparisons and the Super Bowl are affected.");
  }

  // --- Weekly matchups (one file per week, never rewrite an already-final week) ---
  let allFinalizedMatchups: WeeklyMatchup[] = [];
  for (let week = 1; week <= 17; week++) {
    const path = weekFileName(DATA_DIR, week);
    const existing = await readJsonIfExists<{ week: number; matchups: WeeklyMatchup[] }>(path);
    if (existing && existing.matchups.every((m) => m.state === "final" || m.state === "overridden")) {
      allFinalizedMatchups = allFinalizedMatchups.concat(existing.matchups);
      continue; // protect finalized/historical weeks from destructive resync
    }
    if (week > upToWeek) continue;

    let weekMatchups: WeeklyMatchup[] = [];
    for (const side of [afc, nfc] as const) {
      if (!side.payload) continue;
      const entries = side.payload.matchupsByWeek[week];
      if (!entries) continue;
      const { matchups, unpaired, overCrowded } = pairMatchups(entries, side.conference, side.payload.league.league_id, week);
      if (unpaired.length > 1) warnings.push(`${side.conference} week ${week}: ${unpaired.length} unpaired matchup entries (bye weeks expected to be 1).`);
      if (overCrowded.length > 0) warnings.push(`${side.conference} week ${week}: matchup_id(s) ${overCrowded.join(",")} had more than 2 entries.`);
      const withState = matchups.map((m) => ({
        ...m,
        state: deriveMatchupState(week, nflState, m.teamA, m.teamB.teamId ? m.teamB : null),
      }));
      weekMatchups = weekMatchups.concat(withState);
    }

    // Apply overrides scoped to individual matchups.
    weekMatchups = weekMatchups.map((m) => {
      const applicable = overridesFor(overrides, "matchup", m.matchupId);
      if (applicable.length === 0) return m;
      let updated: WeeklyMatchup = m;
      for (const o of applicable) updated = applyOverrideField(updated, o);
      return { ...updated, state: "overridden" };
    });

    if (weekMatchups.length > 0) {
      await writeJson(path, { week, state: week <= upToWeek ? "computed" : "scheduled", matchups: weekMatchups });
      weeksUpdated.push(week);
    }
    allFinalizedMatchups = allFinalizedMatchups.concat(weekMatchups.filter((m) => m.state === "final" || m.state === "overridden"));
  }

  // --- Standings ---
  if (allTeams.length > 0) {
    const standings = computeStandings(allTeams, allFinalizedMatchups);
    await writeJson(paths.standings(DATA_DIR), {
      generatedAt: startedAt,
      season: SEASON,
      asOfWeek: upToWeek,
      tiebreakRulesVersion: DEFAULT_LEAGUE_RULES.rulesVersion,
      scoringParityWarning: scoringParityMismatch,
      ...standings,
    });

    // --- Playoffs: a "playoff picture" projected from current standings
    // recomputes every run once real games have been played, then locks
    // (becomes official) once the playoff window (Week 14 by default) starts.
    for (const conf of ["afc", "nfc"] as const) {
      const confStandings = conf === "afc" ? standings.afc : standings.nfc;
      if (confStandings.length < 6) continue;
      const hasPlayedGames = confStandings.some((r) => r.gamesPlayed > 0);
      if (!hasPlayedGames) continue;

      let seeds = await readJsonIfExists<PlayoffSeeds>(paths.seeds(DATA_DIR, conf));
      if (!seeds || !seeds.lockedAt) {
        const locking = upToWeek >= PLAYOFF_START_WEEK;
        seeds = seedFromStandings(confStandings, SEASON, DEFAULT_LEAGUE_RULES.rulesVersion, 6, locking ? startedAt : null);
        await writeJson(paths.seeds(DATA_DIR, conf), seeds);
      }

      const bracket: PlayoffBracket = buildBracket(
        seeds,
        { wildcard: PLAYOFF_START_WEEK, semifinal: PLAYOFF_START_WEEK + 1, championship: PLAYOFF_START_WEEK + 2 },
        PLAYOFF_RESEED,
        upToWeek,
      );
      await writeJson(paths.bracket(DATA_DIR, conf), bracket);
    }

    // --- Super Bowl (only once both conference championships are final) ---
    if (upToWeek >= SUPER_BOWL_WEEK - 1) {
      const afcBracket = await readJsonIfExists<PlayoffBracket>(paths.bracket(DATA_DIR, "afc"));
      const nfcBracket = await readJsonIfExists<PlayoffBracket>(paths.bracket(DATA_DIR, "nfc"));
      const afcChampion = afcBracket ? resolveChampion(afcBracket) : null;
      const nfcChampion = nfcBracket ? resolveChampion(nfcBracket) : null;

      const sbWeekFile = await readJsonIfExists<{ matchups: WeeklyMatchup[] }>(weekFileName(DATA_DIR, SUPER_BOWL_WEEK));
      const afcSide = afcChampion && sbWeekFile ? findChampionSide(sbWeekFile.matchups, afcChampion) : null;
      const nfcSide = nfcChampion && sbWeekFile ? findChampionSide(sbWeekFile.matchups, nfcChampion) : null;
      const previous = await readJsonIfExists<SuperBowl>(paths.superBowl(DATA_DIR));

      const superBowl = buildSuperBowl(
        SEASON,
        SUPER_BOWL_WEEK,
        afcChampion,
        nfcChampion,
        afcSide,
        nfcSide,
        startedAt,
        scoringParityMismatch,
        previous,
      );
      await writeJson(paths.superBowl(DATA_DIR), superBowl);
    }
  }

  // --- Players (trimmed to rostered players only) ---
  const rosteredIds = new Set<string>();
  for (const side of [afc, nfc] as const) {
    if (!side.payload) continue;
    for (const roster of side.payload.rosters) {
      for (const id of roster.players ?? []) rosteredIds.add(id);
    }
  }
  if (rosteredIds.size > 0) {
    try {
      const players = await fetchTrimmedPlayers(client, rosteredIds);
      await writeJson(paths.players(DATA_DIR), players);
    } catch (err) {
      warnings.push(`Failed to refresh player directory: ${String(err)}`);
    }
  }

  await writeJson(paths.season(DATA_DIR), {
    season: SEASON,
    status: upToWeek >= SUPER_BOWL_WEEK ? "complete" : "in_progress",
    activeWeek: upToWeek,
    rulesVersion: DEFAULT_LEAGUE_RULES.rulesVersion,
    playoffStartWeek: PLAYOFF_START_WEEK,
    superBowlWeek: SUPER_BOWL_WEEK,
    playoffTeamCount: DEFAULT_LEAGUE_RULES.playoffTeamCount,
    playoffReseed: PLAYOFF_RESEED,
  });

  const finishedAt = new Date().toISOString();
  const entry: SyncRunEntry = {
    runId,
    startedAt,
    finishedAt,
    success: errors.length === 0,
    leagues: {
      afc: afc.payload ? okResult(afc.payload.rosters.length, stableHash(afc.payload.league)) : failedResult(afc.error ?? "unknown"),
      nfc: nfc.payload ? okResult(nfc.payload.rosters.length, stableHash(nfc.payload.league)) : failedResult(nfc.error ?? "unknown"),
    },
    warnings,
    errors,
    weeksUpdated,
  };
  await appendSyncLog(DATA_DIR, entry);

  console.log(summarizeRun(entry));
  for (const w of warnings) console.warn(`WARNING: ${w}`);
  for (const e of errors) console.error(`ERROR: ${e}`);
}

async function tryFetchLeague(client: SleeperClient, conference: "AFC" | "NFC", leagueId: string, upToWeek: number) {
  try {
    const payload = await fetchLeaguePayload(client, leagueId, upToWeek);
    return { conference, payload, error: null as string | null };
  } catch (err) {
    return { conference, payload: null, error: err instanceof Error ? err.message : String(err) };
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
