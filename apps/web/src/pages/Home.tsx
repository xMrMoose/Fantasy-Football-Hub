import { Link } from "react-router-dom";
import type { StandingsSnapshot } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";
import { useTeams } from "../data/useTeams.js";
import { FreshnessBanner } from "../components/FreshnessBanner.js";
import { StandingsTable } from "../components/StandingsTable.js";

export function Home() {
  const { teamNamesById } = useTeams();
  const standings = useDataQuery<StandingsSnapshot>("standings/standings-latest.json", (d) => d.combined.length === 0);

  return (
    <div className="container">
      <h1>24-Team Fantasy Football Hub</h1>
      <FreshnessBanner />
      {standings.status === "loading" && <p>Loading…</p>}
      {standings.status === "error" && <div className="banner warn">Standings unavailable: {standings.error}</div>}
      {standings.status === "empty" && <p>No standings yet — check back after the season kicks off.</p>}
      {standings.status === "ok" && (
        <>
          <h2>Combined top teams</h2>
          <StandingsTable rows={standings.data.combined.slice(0, 5)} teamNamesById={teamNamesById} showConference />
          {standings.data.scoringParityWarning && (
            <div className="banner warn">
              AFC and NFC scoring settings differ this season — combined point totals are not directly comparable.
            </div>
          )}
        </>
      )}
      <p>
        <Link to="/standings">Full standings</Link> · <Link to="/matchups">This week's matchups</Link> ·{" "}
        <Link to="/playoffs">Playoff picture</Link> · <Link to="/superbowl">Super Bowl</Link>
      </p>
    </div>
  );
}
