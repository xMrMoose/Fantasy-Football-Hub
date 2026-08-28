import { useState } from "react";
import { Link } from "react-router-dom";
import type { StandingsSnapshot } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";
import { useTeams } from "../data/useTeams.js";
import { ConferenceFilterTabs, type ConferenceFilter } from "../components/ConferenceFilterTabs.js";
import { StandingsTable } from "../components/StandingsTable.js";
import { FreshnessBanner } from "../components/FreshnessBanner.js";

export function Standings() {
  const [filter, setFilter] = useState<ConferenceFilter>("ALL");
  const { teamNamesById } = useTeams();
  const state = useDataQuery<StandingsSnapshot>("standings/standings-latest.json", (d) => d.combined.length === 0);

  return (
    <div className="container">
      <h1>24-Team Fantasy Football Hub</h1>
      <FreshnessBanner />
      <ConferenceFilterTabs value={filter} onChange={setFilter} />
      {state.status === "loading" && <p>Loading…</p>}
      {state.status === "error" && <div className="banner warn">Standings unavailable: {state.error}</div>}
      {state.status === "empty" && <p>No standings data yet.</p>}
      {state.status === "ok" && (
        <>
          {state.data.scoringParityWarning && (
            <div className="banner warn">
              AFC and NFC scoring settings differ this season — combined point totals are not directly comparable;
              use record/rank rather than raw points when comparing across conferences.
            </div>
          )}
          <StandingsTable
            rows={filter === "ALL" ? state.data.combined : filter === "AFC" ? state.data.afc : state.data.nfc}
            teamNamesById={teamNamesById}
            showConference={filter === "ALL"}
          />
        </>
      )}
      <p>
        <Link to="/matchups">This week's matchups</Link> · <Link to="/playoffs">Playoff picture</Link>
      </p>
    </div>
  );
}
