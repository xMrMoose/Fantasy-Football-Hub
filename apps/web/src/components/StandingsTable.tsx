import { Link } from "react-router-dom";
import type { StandingsRow } from "@fantasy/domain";

export function StandingsTable({
  rows,
  teamNamesById,
  showConference,
}: {
  rows: StandingsRow[];
  teamNamesById: Record<string, string>;
  showConference: boolean;
}) {
  if (rows.length === 0) {
    return <p>No standings data yet.</p>;
  }
  return (
    <ul className="standings-list">
      {rows.map((row) => (
        <li key={row.teamId}>
          <Link className="standings-row" to={`/team/${row.teamId}`}>
            <div className="rank" aria-label={`Rank ${row.rank}`}>
              {row.rank}
            </div>
            <div className="team-block">
              <div className="team-line">
                <span className="team-name">{teamNamesById[row.teamId] ?? row.teamId}</span>
                {showConference && (
                  <span className={`conf-pill ${row.conference === "AFC" ? "conf-afc" : "conf-nfc"}`}>
                    {row.conference}
                  </span>
                )}
              </div>
              <div className="record-line" aria-label="Win-loss-tie record and win percentage">
                {row.wins}-{row.losses}-{row.ties} &middot; {row.winPct.toFixed(3)}
              </div>
            </div>
            <div className="stat-block">
              <div className="pf-pa" aria-label="Points for and points against">
                {row.pointsFor.toFixed(1)} PF &middot; {row.pointsAgainst.toFixed(1)} PA
              </div>
              <div className={`diff ${row.pointDiff >= 0 ? "positive" : "negative"}`} aria-label="Point differential">
                {row.pointDiff >= 0 ? "+" : ""}
                {row.pointDiff.toFixed(1)}
              </div>
            </div>
            <span className="row-chevron" aria-hidden="true">›</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
