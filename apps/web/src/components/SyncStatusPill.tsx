import type { SyncRunEntry } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Always-visible compact "last synced" indicator in the app header. Detailed warnings for degraded/missing data live in FreshnessBanner on each page. */
export function SyncStatusPill() {
  const state = useDataQuery<SyncRunEntry[]>("meta/sync-log.json", (d) => d.length === 0);

  if (state.status === "loading") return null;
  if (state.status === "error" || state.status === "empty") {
    return (
      <div className="sync-pill degraded">
        <span className="dot" aria-hidden="true"></span>
        <span>No sync yet</span>
      </div>
    );
  }

  const latest = state.data[state.data.length - 1];
  const degraded = latest.leagues.afc.status !== "ok" || latest.leagues.nfc.status !== "ok";

  return (
    <div className={`sync-pill${degraded ? " degraded" : ""}`} title={new Date(latest.finishedAt).toLocaleString()}>
      <span className="dot" aria-hidden="true"></span>
      <span>Synced {timeAgo(latest.finishedAt)}</span>
    </div>
  );
}
