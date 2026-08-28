import { useState } from "react";
import type { WeeklyMatchup } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";
import { useTeams } from "../data/useTeams.js";
import { WeekSelector } from "../components/WeekSelector.js";
import { ConferenceFilterTabs, type ConferenceFilter } from "../components/ConferenceFilterTabs.js";
import { ScoreCard } from "../components/ScoreCard.js";
import { FreshnessBanner } from "../components/FreshnessBanner.js";

interface WeekFile {
  week: number;
  state: string;
  matchups: WeeklyMatchup[];
}

export function WeeklyMatchups() {
  const [week, setWeek] = useState(1);
  const [filter, setFilter] = useState<ConferenceFilter>("ALL");
  const { teamNamesById } = useTeams();
  const weekData = useDataQuery<WeekFile>(`matchups/week-${String(week).padStart(2, "0")}.json`, (d) => d.matchups.length === 0);

  const matchups =
    weekData.status === "ok"
      ? weekData.data.matchups.filter((m) => filter === "ALL" || m.conference === filter)
      : [];

  return (
    <div className="container">
      <h1>Weekly Matchups</h1>
      <FreshnessBanner />
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <WeekSelector week={week} onChange={setWeek} />
        <ConferenceFilterTabs value={filter} onChange={setFilter} />
      </div>
      {weekData.status === "loading" && <p>Loading…</p>}
      {weekData.status === "error" && (
        <div className="banner warn">No data for week {week} yet ({weekData.error}).</div>
      )}
      {weekData.status === "empty" && <p>No matchups recorded for week {week} yet.</p>}
      {weekData.status === "ok" &&
        (matchups.length > 0 ? (
          matchups.map((m) => <ScoreCard key={m.matchupId} matchup={m} teamNamesById={teamNamesById} week={week} />)
        ) : (
          <p>No matchups for this filter.</p>
        ))}
    </div>
  );
}
