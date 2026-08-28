import type { SyncRunEntry } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";

export function FreshnessBanner() {
  const state = useDataQuery<SyncRunEntry[]>("meta/sync-log.json", (d) => d.length === 0);

  if (state.status === "loading") return null;
  if (state.status === "error") {
    return <div className="banner warn">Unable to load sync status. Showing whatever data is available.</div>;
  }
  if (state.status === "empty") {
    return <div className="banner warn">No sync has run yet — data will appear after the first scheduled sync.</div>;
  }

  const latest = state.data[state.data.length - 1];
  const time = new Date(latest.finishedAt).toLocaleString();
  const degraded = latest.leagues.afc.status !== "ok" || latest.leagues.nfc.status !== "ok";

  if (degraded) {
    const failedConf = latest.leagues.afc.status !== "ok" ? "AFC" : "NFC";
    return (
      <div className="banner warn" role="alert">
        Data as of {time}. {failedConf} data could not be refreshed on the last sync — showing the last known-good
        data for that conference.
      </div>
    );
  }

  return <div className="banner info">Data as of {time}.</div>;
}
