import { Link } from "react-router-dom";
import type { PlayerLineupEntry, StandingsRow, WeeklyMatchup } from "@fantasy/domain";
import { StatusBadge } from "./StatusBadge.js";

/** Sum of projected points across a lineup's starters — null if none of them have a projection yet. */
function sumProjected(lineup: PlayerLineupEntry[], projectionsById: Record<string, number>): number | null {
  let sum = 0;
  let any = false;
  for (const entry of lineup) {
    if (!entry.starter) continue;
    const proj = projectionsById[entry.playerId];
    if (typeof proj === "number") {
      sum += proj;
      any = true;
    }
  }
  return any ? sum : null;
}

function recordLine(row: StandingsRow | undefined): string | null {
  if (!row) return null;
  return `${row.wins}-${row.losses}-${row.ties}`;
}

function TeamColumn({
  name,
  record,
  points,
  projected,
  isLeader,
  isWinner,
}: {
  name: string;
  record: string | null;
  points: number | null;
  projected: number | null;
  isLeader: boolean;
  isWinner: boolean;
}) {
  return (
    <div className={`score-card-team${isLeader ? " leading" : ""}`}>
      <div className="score-card-name">
        {name} {isWinner && "🏆"}
      </div>
      {record && <div className="score-card-record">{record}</div>}
      <div className="score-card-points">{points !== null ? points.toFixed(1) : "—"}</div>
      <div className="score-card-proj">{projected !== null ? `Proj ${projected.toFixed(1)}` : "Proj —"}</div>
    </div>
  );
}

export function ScoreCard({
  matchup,
  teamNamesById,
  standingsByTeamId,
  projectionsById,
  week,
  showConference,
}: {
  matchup: WeeklyMatchup;
  teamNamesById: Record<string, string>;
  standingsByTeamId: Record<string, StandingsRow>;
  projectionsById: Record<string, number>;
  week: number;
  showConference: boolean;
}) {
  const isBye = !matchup.teamB.teamId;
  const isFinal = matchup.state === "final";

  const aScore = matchup.teamA.customPoints ?? matchup.teamA.points;
  const bScore = matchup.teamB.customPoints ?? matchup.teamB.points;
  const aName = teamNamesById[matchup.teamA.teamId] ?? matchup.teamA.teamId;
  const bName = isBye ? "Bye" : teamNamesById[matchup.teamB.teamId] ?? matchup.teamB.teamId;

  const card = (
    <div className={`score-card conf-${matchup.conference.toLowerCase()}`}>
      <div className="score-card-header">
        <div className="score-card-badges">
          <StatusBadge state={matchup.state} />
          {matchup.customPointsUsed && <span className="badge overridden">Adjusted score</span>}
        </div>
        {showConference && (
          <span className={`conf-pill ${matchup.conference === "AFC" ? "conf-afc" : "conf-nfc"}`}>
            {matchup.conference}
          </span>
        )}
      </div>
      <div className="score-card-matchup">
        <TeamColumn
          name={aName}
          record={recordLine(standingsByTeamId[matchup.teamA.teamId])}
          points={aScore}
          projected={sumProjected(matchup.teamA.lineup, projectionsById)}
          isLeader={!isBye && matchup.winnerTeamId === matchup.teamA.teamId}
          isWinner={isFinal && matchup.winnerTeamId === matchup.teamA.teamId}
        />
        {isBye ? (
          <div className="score-card-divider">BYE</div>
        ) : (
          <>
            <div className="score-card-divider">VS</div>
            <TeamColumn
              name={bName}
              record={recordLine(standingsByTeamId[matchup.teamB.teamId])}
              points={bScore}
              projected={sumProjected(matchup.teamB.lineup, projectionsById)}
              isLeader={matchup.winnerTeamId === matchup.teamB.teamId}
              isWinner={isFinal && matchup.winnerTeamId === matchup.teamB.teamId}
            />
          </>
        )}
      </div>
    </div>
  );

  if (isBye) return card;

  return (
    <Link to={`/matchups/${week}/${encodeURIComponent(matchup.matchupId)}`} className="score-card-link">
      {card}
    </Link>
  );
}
