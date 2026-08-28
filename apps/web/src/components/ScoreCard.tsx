import { Link } from "react-router-dom";
import type { WeeklyMatchup } from "@fantasy/domain";
import { StatusBadge } from "./StatusBadge.js";

export function ScoreCard({
  matchup,
  teamNamesById,
  week,
}: {
  matchup: WeeklyMatchup;
  teamNamesById: Record<string, string>;
  week: number;
}) {
  const isBye = !matchup.teamB.teamId;
  const aScore = matchup.teamA.customPoints ?? matchup.teamA.points;
  const bScore = matchup.teamB.customPoints ?? matchup.teamB.points;
  const aName = teamNamesById[matchup.teamA.teamId] ?? matchup.teamA.teamId;
  const bName = isBye ? "Bye" : teamNamesById[matchup.teamB.teamId] ?? matchup.teamB.teamId;

  const card = (
    <div className={`score-card conf-${matchup.conference.toLowerCase()}`}>
      <div className="teams">
        <span>
          {aName} {matchup.winnerTeamId === matchup.teamA.teamId && "🏆"}
        </span>
        <strong>{aScore !== null ? aScore.toFixed(2) : "—"}</strong>
      </div>
      {!isBye && (
        <div className="teams">
          <span>
            {bName} {matchup.winnerTeamId === matchup.teamB.teamId && "🏆"}
          </span>
          <strong>{bScore !== null ? bScore.toFixed(2) : "—"}</strong>
        </div>
      )}
      <div style={{ marginTop: "0.5rem" }}>
        <StatusBadge state={matchup.state} />
        {matchup.customPointsUsed && <span className="badge overridden" style={{ marginLeft: "0.4rem" }}>Adjusted score</span>}
      </div>
    </div>
  );

  if (isBye) return card;

  return (
    <Link to={`/matchups/${week}/${encodeURIComponent(matchup.matchupId)}`} style={{ textDecoration: "none", color: "inherit" }}>
      {card}
    </Link>
  );
}
