import { useParams, Link } from "react-router-dom";
import type { PlayerLineupEntry, SourceLeague, WeeklyMatchup } from "@fantasy/domain";
import { pairStartersBySlot } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";
import { useTeams } from "../data/useTeams.js";
import { HeadToHead, type H2HRow } from "../components/HeadToHead.js";
import type { PlayerInfo } from "../components/LineupTable.js";
import { StatusBadge } from "../components/StatusBadge.js";

interface WeekFile {
  week: number;
  state: string;
  matchups: WeeklyMatchup[];
}

/** Bench seats aren't individually labelled, so pairing is just by order — padded to the longer side. */
function pairBench(benchA: PlayerLineupEntry[], benchB: PlayerLineupEntry[]): H2HRow[] {
  const length = Math.max(benchA.length, benchB.length);
  return Array.from({ length }, (_, i) => ({ slot: "BN", a: benchA[i] ?? null, b: benchB[i] ?? null }));
}

export function MatchupDetail() {
  const { week, matchupId } = useParams<{ week: string; matchupId: string }>();
  const weekNum = Number(week);
  const { teamNamesById } = useTeams();
  const weekData = useDataQuery<WeekFile>(`matchups/week-${String(weekNum).padStart(2, "0")}.json`, (d) => d.matchups.length === 0);
  const players = useDataQuery<Record<string, PlayerInfo>>("players/players-trimmed.json");
  const projections = useDataQuery<Record<string, number>>(`projections/week-${String(weekNum).padStart(2, "0")}.json`);

  const matchup = weekData.status === "ok" ? weekData.data.matchups.find((m) => m.matchupId === matchupId) : undefined;
  const sourceLeague = useDataQuery<SourceLeague>(
    `source-leagues/${(matchup?.conference ?? "afc").toLowerCase()}.json`,
  );

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
  if (!matchup) {
    return (
      <div className="container">
        <p>Matchup not found.</p>
        <Link to="/matchups">Back to matchups</Link>
      </div>
    );
  }

  const playersById = players.status === "ok" ? players.data : {};
  const projectionsById = projections.status === "ok" ? projections.data : {};
  const aName = teamNamesById[matchup.teamA.teamId] ?? matchup.teamA.teamId;
  const bName = matchup.teamB.teamId ? teamNamesById[matchup.teamB.teamId] ?? matchup.teamB.teamId : "Bye";
  const aScore = matchup.teamA.customPoints ?? matchup.teamA.points;
  const bScore = matchup.teamB.customPoints ?? matchup.teamB.points;

  const rosterPositions = sourceLeague.status === "ok" ? sourceLeague.data.rosterPositions : [];
  const startingRows = matchup.teamB.teamId
    ? pairStartersBySlot(rosterPositions, matchup.teamA.lineup, matchup.teamB.lineup)
    : [];
  const benchRows = matchup.teamB.teamId
    ? pairBench(
        matchup.teamA.lineup.filter((e) => !e.starter),
        matchup.teamB.lineup.filter((e) => !e.starter),
      )
    : [];

  return (
    <div className="container">
      <Link to="/matchups" className="back-link">
        ← Back to matchups
      </Link>

      <div className="h2h-header">
        <div className="h2h-header-team">
          <div className="h2h-header-name">{aName}</div>
          <div className="h2h-header-score">{aScore !== null ? aScore.toFixed(1) : "—"}</div>
        </div>
        <StatusBadge state={matchup.state} />
        <div className="h2h-header-team">
          <div className="h2h-header-name">{bName}</div>
          <div className="h2h-header-score">{bScore !== null ? bScore.toFixed(1) : "—"}</div>
        </div>
      </div>
      {matchup.customPointsUsed && <span className="badge overridden">Adjusted score</span>}

      {matchup.teamB.teamId ? (
        <>
          <HeadToHead rows={startingRows} playersById={playersById} projectionsById={projectionsById} />
          {benchRows.length > 0 && (
            <>
              <h2 className="section-title">Bench</h2>
              <HeadToHead rows={benchRows} playersById={playersById} projectionsById={projectionsById} />
            </>
          )}
        </>
      ) : (
        <p className="muted">Bye week — no opponent this week.</p>
      )}
    </div>
  );
}
