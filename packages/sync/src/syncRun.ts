import type { SyncRunEntry, SyncRunLeagueResult } from "@fantasy/domain";
import { readJsonIfExists, writeJson, paths } from "./buildDataDir.js";

export function newRunId(): string {
  return `run-${Date.now()}`;
}

export function okResult(rosterCount: number, rawHash: string): SyncRunLeagueResult {
  return { status: "ok", rosterCount, rawHash, error: null };
}

export function failedResult(error: string): SyncRunLeagueResult {
  return { status: "failed", rosterCount: null, rawHash: null, error };
}

export async function appendSyncLog(dataDir: string, entry: SyncRunEntry): Promise<void> {
  const existing = (await readJsonIfExists<SyncRunEntry[]>(paths.syncLog(dataDir))) ?? [];
  existing.push(entry);
  // Keep the log bounded so it doesn't grow forever; last 200 runs (~weeks of history at hourly cadence) is plenty.
  const trimmed = existing.slice(-200);
  await writeJson(paths.syncLog(dataDir), trimmed);
}

/** One-line summary used as the git commit message body — the human-readable half of the git-as-audit-trail design. */
export function summarizeRun(entry: SyncRunEntry): string {
  const afc = entry.leagues.afc.status;
  const nfc = entry.leagues.nfc.status;
  const weeks = entry.weeksUpdated.length > 0 ? `weeks ${entry.weeksUpdated.join(",")}` : "no week changes";
  const warnings = entry.warnings.length > 0 ? `, ${entry.warnings.length} warning(s)` : "";
  return `sync ${entry.runId}: AFC=${afc} NFC=${nfc}, ${weeks}${warnings}`;
}
