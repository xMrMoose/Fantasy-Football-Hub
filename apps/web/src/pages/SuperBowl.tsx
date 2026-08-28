import type { SuperBowl as SuperBowlData } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";
import { useTeams } from "../data/useTeams.js";
import { LineupTable, type PlayerInfo } from "../components/LineupTable.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { FreshnessBanner } from "../components/FreshnessBanner.js";

export function SuperBowl() {
  const { teamNamesById } = useTeams();
  const sb = useDataQuery<SuperBowlData>("superbowl/week17-superbowl.json");
  const players = useDataQuery<Record<string, PlayerInfo>>("players/players-trimmed.json");

  return (
    <div className="container">
      <h1>Week 17 Super Bowl</h1>
      <FreshnessBanner />
      {sb.status === "loading" && <p>Loading…</p>}
      {sb.status === "error" && <p>Super Bowl data not available yet — check back once both conference championships are final.</p>}
      {sb.status === "ok" && (
        <>
          <StatusBadge state={sb.data.state} />
          {sb.data.blockingReason && <div className="banner warn">{sb.data.blockingReason}</div>}
          <p>
            {sb.data.afcChampionTeamId ? teamNamesById[sb.data.afcChampionTeamId] ?? sb.data.afcChampionTeamId : "AFC champion TBD"}{" "}
            {sb.data.scores.afc !== null && <strong>{sb.data.scores.afc.toFixed(2)}</strong>}
            {" vs. "}
            {sb.data.nfcChampionTeamId ? teamNamesById[sb.data.nfcChampionTeamId] ?? sb.data.nfcChampionTeamId : "NFC champion TBD"}{" "}
            {sb.data.scores.nfc !== null && <strong>{sb.data.scores.nfc.toFixed(2)}</strong>}
          </p>
          {sb.data.winnerTeamId && <p>Winner: {teamNamesById[sb.data.winnerTeamId] ?? sb.data.winnerTeamId} 🏆</p>}
          <p style={{ color: "var(--text-dim)" }}>Last updated: {new Date(sb.data.lastUpdated).toLocaleString()}</p>

          {sb.data.lineupSnapshot && players.status === "ok" && (
            <>
              <LineupTable lineup={sb.data.lineupSnapshot.afc} playersById={players.data} title="AFC champion lineup" />
              <LineupTable lineup={sb.data.lineupSnapshot.nfc} playersById={players.data} title="NFC champion lineup" />
            </>
          )}

          <h2>Override history</h2>
          {sb.data.overrideHistory.length === 0 ? (
            <p>No manual overrides have been applied.</p>
          ) : (
            <ul>
              {sb.data.overrideHistory.map((o, i) => (
                <li key={i}>
                  <strong>{o.field}</strong>: {JSON.stringify(o.before)} → {JSON.stringify(o.after)} — {o.reason} (
                  {o.actor}, {new Date(o.timestamp).toLocaleString()})
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
