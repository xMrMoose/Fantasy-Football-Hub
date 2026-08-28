import { useEffect, useRef, useState } from "react";
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

interface SeasonFile {
  activeWeek: number;
}

function clampWeek(w: number): number {
  return Math.min(17, Math.max(1, w));
}

export function WeeklyMatchups() {
  const season = useDataQuery<SeasonFile>("meta/season.json");
  const [week, setWeek] = useState(() => (season.status === "ok" ? clampWeek(season.data.activeWeek) : 1));
  const [filter, setFilter] = useState<ConferenceFilter>("ALL");
  const { teamNamesById } = useTeams();
  const weekData = useDataQuery<WeekFile>(`matchups/week-${String(week).padStart(2, "0")}.json`, (d) => d.matchups.length === 0);

  // Jump to the real current week once it's known, but only if the viewer
  // hasn't already picked a week themselves (season.json can resolve after
  // the initial render, e.g. on a page's very first data fetch this session).
  const userPicked = useRef(false);
  useEffect(() => {
    if (userPicked.current || season.status !== "ok") return;
    setWeek(clampWeek(season.data.activeWeek));
  }, [season.status]);

  function handleWeekChange(w: number) {
    userPicked.current = true;
    setWeek(w);
  }

  const matchups =
    weekData.status === "ok"
      ? weekData.data.matchups.filter((m) => filter === "ALL" || m.conference === filter)
      : [];

  return (
    <div className="container">
      <h1 className="page-title">Matchups</h1>
      <FreshnessBanner />
      <WeekSelector
        week={week}
        onChange={handleWeekChange}
        currentWeek={season.status === "ok" ? clampWeek(season.data.activeWeek) : undefined}
      />
      <ConferenceFilterTabs value={filter} onChange={setFilter} />
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
