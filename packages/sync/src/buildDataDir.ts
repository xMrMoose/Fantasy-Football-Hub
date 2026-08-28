import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

export async function readJsonIfExists<T>(path: string): Promise<T | null> {
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as T;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf-8");
}

export function weekFileName(dataDir: string, week: number): string {
  return join(dataDir, "matchups", `week-${String(week).padStart(2, "0")}.json`);
}

export const paths = {
  season: (dataDir: string) => join(dataDir, "meta", "season.json"),
  syncLog: (dataDir: string) => join(dataDir, "meta", "sync-log.json"),
  sourceLeague: (dataDir: string, conference: "afc" | "nfc") => join(dataDir, "source-leagues", `${conference}.json`),
  players: (dataDir: string) => join(dataDir, "players", "players-trimmed.json"),
  teams: (dataDir: string) => join(dataDir, "teams", "teams.json"),
  standings: (dataDir: string) => join(dataDir, "standings", "standings-latest.json"),
  seeds: (dataDir: string, conference: "afc" | "nfc") => join(dataDir, "playoffs", `seeds-${conference}.json`),
  bracket: (dataDir: string, conference: "afc" | "nfc") => join(dataDir, "playoffs", `bracket-${conference}.json`),
  superBowl: (dataDir: string) => join(dataDir, "superbowl", "week17-superbowl.json"),
};
