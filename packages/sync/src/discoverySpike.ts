import { SleeperClient } from "./sleeperClient.js";
import { writeJson } from "./buildDataDir.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * One-off manual script: fetches real payloads from both configured leagues
 * and writes sanitized samples into fixtures/, for (a) inspecting real
 * per-player scoring / Week 17 lineup / scoring-parity behavior per the
 * brief's "important live-scoring caveat", and (b) replacing the
 * hand-authored contract-test fixtures with real shapes. Never run in the
 * default test suite — only via `npm run discover` or discovery-spike.yml,
 * and its output is reviewed via PR before merging into fixtures/.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FIXTURES_DIR = join(ROOT, "fixtures", "_discovery");

const SEASON = process.env.SEASON ?? "2026";
const AFC_LEAGUE_ID = process.env.AFC_SLEEPER_LEAGUE_ID ?? "";
const NFC_LEAGUE_ID = process.env.NFC_SLEEPER_LEAGUE_ID ?? "";

function sanitizeUser(u: Record<string, unknown>): Record<string, unknown> {
  // Sleeper user objects don't normally carry email/phone, but scrub defensively.
  const { email, phone, ...rest } = u as Record<string, unknown> & { email?: unknown; phone?: unknown };
  return rest;
}

async function dumpLeague(client: SleeperClient, label: "afc" | "nfc", leagueId: string) {
  if (!leagueId) {
    console.warn(`Skipping ${label}: no league ID configured.`);
    return;
  }
  const league = await client.get(`/league/${leagueId}`);
  const rosters = await client.get(`/league/${leagueId}/rosters`);
  const usersRaw = (await client.get(`/league/${leagueId}/users`)) as Record<string, unknown>[];
  const users = usersRaw.map(sanitizeUser);
  const winnersBracket = await client.get(`/league/${leagueId}/winners_bracket`).catch(() => []);
  const losersBracket = await client.get(`/league/${leagueId}/losers_bracket`).catch(() => []);

  await writeJson(join(FIXTURES_DIR, label, "league.json"), league);
  await writeJson(join(FIXTURES_DIR, label, "rosters.json"), rosters);
  await writeJson(join(FIXTURES_DIR, label, "users.json"), users);
  await writeJson(join(FIXTURES_DIR, label, "winners_bracket.json"), winnersBracket);
  await writeJson(join(FIXTURES_DIR, label, "losers_bracket.json"), losersBracket);

  const nflState = (await client.get("/state/nfl")) as { week: number };
  const currentWeek = Math.max(1, Math.min(17, nflState.week ?? 1));
  for (const week of [1, currentWeek, 17]) {
    const matchups = await client.get(`/league/${leagueId}/matchups/${week}`);
    await writeJson(join(FIXTURES_DIR, label, `matchups-week-${week}.json`), matchups);
  }

  console.log(`Wrote discovery fixtures for ${label} league ${leagueId}.`);
}

async function main() {
  const client = new SleeperClient();
  await writeJson(join(FIXTURES_DIR, "state.json"), await client.get("/state/nfl"));
  await dumpLeague(client, "afc", AFC_LEAGUE_ID);
  await dumpLeague(client, "nfc", NFC_LEAGUE_ID);
  console.log(`Season: ${SEASON}. Review fixtures/_discovery/** before promoting into fixtures/.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
