import { useParams, Link } from "react-router-dom";
import type { WeeklyMatchup } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";
import { useTeams } from "../data/useTeams.js";
import { LineupTable, type PlayerInfo } from "../components/LineupTable.js";
import { StatusBadge } from "../components/StatusBadge.js";

interface WeekFile {
  week: number;
  state: string;
  matchups: WeeklyMatchup[];
}

export function MatchupDetail() {
  const { week, matchupId } = useParams<{ week: string; matchupId: string }>();
  const weekNum = Number(week);
  const { teamNamesById } = useTeams();
  const weekData = useDataQuery<WeekFile>(`matchups/week-${String(weekNum).padStart(2, "0")}.json`, (d) => d.matchups.length === 0);
  const players = useDataQuery<Record<string, PlayerInfo>>("players/players-trimmed.json");

  if (weekData.status === "loading" || players.status === "loading") {
    return (
      <div className="container">
        <p>Loading…</p>
      </div>
    );
  }
  if (weekData.status !== "ok") {
    return (
      <div className="container">
        <p>Matchup data unavailable.</p>
        <Link to="/matchups">Back to matchups</Link>
      </div>
    );
  }

  const matchup = weekData.data.matchups.find((m) => m.matchupId === matchupId);
  if (!matchup) {
    return (
      <div className="container">
        <p>Matchup not found.</p>
        <Link to="/matchups">Back to matchups</Link>
      </div>
    );
  }

  const playersById = players.status === "ok" ? players.data : {};
  const aName = teamNamesById[matchup.teamA.teamId] ?? matchup.teamA.teamId;
  const bName = matchup.teamB.teamId ? teamNamesById[matchup.teamB.teamId] ?? matchup.teamB.teamId : "Bye";

  return (
    <div className="container">
      <Link to="/matchups">← Back to matchups</Link>
      <h1>
        {aName} vs. {bName}
      </h1>
      <StatusBadge state={matchup.state} />
      {matchup.customPointsUsed && <span className="badge overridden" style={{ marginLeft: "0.4rem" }}>Adjusted score</span>}
      <LineupTable lineup={matchup.teamA.lineup} playersById={playersById} title={`${aName} (${(matchup.teamA.customPoints ?? matchup.teamA.points)?.toFixed(2) ?? "—"} pts)`} />
      {matchup.teamB.teamId && (
        <LineupTable lineup={matchup.teamB.lineup} playersById={playersById} title={`${bName} (${(matchup.teamB.customPoints ?? matchup.teamB.points)?.toFixed(2) ?? "—"} pts)`} />
      )}
    </div>
  );
}
