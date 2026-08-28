import { useParams, Link } from "react-router-dom";
import type {
  StandingsSnapshot,
  StandingsRow,
  TeamRoster,
  RosterSlot,
  SourceLeague,
  WeeklyMatchup,
  Team,
} from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";
import { useTeams } from "../data/useTeams.js";
import type { PlayerInfo } from "../components/LineupTable.js";
import { StatusBadge } from "../components/StatusBadge.js";

interface WeekFile {
  week: number;
  state: string;
  matchups: WeeklyMatchup[];
}

interface SeasonFile {
  season: string;
  activeWeek: number;
}

/** playerId -> projected points. Not produced by the sync yet; the page renders
 * "—" until that file exists, then fills in with no further changes here. */
type ProjectionsFile = Record<string, number>;

export function TeamDetail() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const { state: teamsState, teamNamesById } = useTeams();
  const season = useDataQuery<SeasonFile>("meta/season.json");
  const standings = useDataQuery<StandingsSnapshot>("standings/standings-latest.json");
  const rosters = useDataQuery<TeamRoster[]>("rosters/rosters.json");
  const players = useDataQuery<Record<string, PlayerInfo>>("players/players-trimmed.json");

  const team: Team | undefined =
    teamsState.status === "ok" ? teamsState.data.find((t) => t.teamId === teamId) : undefined;

  // Falls back to the league's slot template when no roster file is committed
  // yet, so the page still shows the right shape of empty roster.
  const conference = team?.conference;
  const sourceLeague = useDataQuery<SourceLeague>(
    conference ? `source-leagues/${conference.toLowerCase()}.json` : "source-leagues/afc.json",
  );

  const week = season.status === "ok" ? season.data.activeWeek : 1;
  const weekData = useDataQuery<WeekFile>(`matchups/week-${String(week).padStart(2, "0")}.json`);
  const projections = useDataQuery<ProjectionsFile>(`projections/week-${String(week).padStart(2, "0")}.json`);

  if (teamsState.status === "loading") {
    return (
      <div className="container">
        <p>Loading…</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container">
        <BackLink />
        <p>Team not found.</p>
      </div>
    );
  }

  const playersById = players.status === "ok" ? players.data : {};
  const projectionsById = projections.status === "ok" ? projections.data : {};

  const roster = rosters.status === "ok" ? rosters.data.find((r) => r.teamId === teamId) : undefined;
  const slots: RosterSlot[] =
    roster?.slots ??
    (sourceLeague.status === "ok"
      ? sourceLeague.data.rosterPositions.map((slot) => ({
          slot,
          starter: slot !== "BN" && slot !== "IR" && slot !== "TAXI",
          playerId: null,
        }))
      : []);

  const row: StandingsRow | undefined =
    standings.status === "ok" ? standings.data.combined.find((r) => r.teamId === teamId) : undefined;

  const matchup =
    weekData.status === "ok"
      ? weekData.data.matchups.find((m) => m.teamA.teamId === teamId || m.teamB.teamId === teamId)
      : undefined;

  // Per-player points for this week come from the matchup lineup; the roster
  // supplies the seat/position labels, which the lineup doesn't carry.
  const pointsByPlayer = new Map<string, number | null>();
  if (matchup) {
    const side = matchup.teamA.teamId === teamId ? matchup.teamA : matchup.teamB;
    for (const entry of side.lineup) pointsByPlayer.set(entry.playerId, entry.points);
  }

  const starters = slots.filter((s) => s.starter);
  const bench = slots.filter((s) => !s.starter);

  return (
    <div className="container">
      <BackLink />

      <div className="team-header">
        <h1 className="page-title">{team.displayName}</h1>
        <span className={`conf-pill ${team.conference === "AFC" ? "conf-afc" : "conf-nfc"}`}>
          {team.conference}
        </span>
      </div>
      {team.ownerDisplayName && <div className="page-subtitle">Managed by {team.ownerDisplayName}</div>}

      {row && (
        <div className="team-stats">
          <Stat label="Rank" value={`#${row.rank}`} />
          <Stat label="Record" value={`${row.wins}-${row.losses}-${row.ties}`} />
          <Stat label="PF" value={row.pointsFor.toFixed(1)} />
          <Stat label="PA" value={row.pointsAgainst.toFixed(1)} />
          <Stat
            label="Diff"
            value={`${row.pointDiff >= 0 ? "+" : ""}${row.pointDiff.toFixed(1)}`}
            tone={row.pointDiff >= 0 ? "positive" : "negative"}
          />
        </div>
      )}

      <h2 className="section-title">Week {week} matchup</h2>
      {matchup ? (
        <MatchupSummary matchup={matchup} teamId={teamId} teamNamesById={teamNamesById} week={week} />
      ) : (
        <p className="muted">No matchup scheduled for week {week} yet.</p>
      )}

      <h2 className="section-title">Roster</h2>
      {slots.length === 0 ? (
        <p className="muted">Roster unavailable.</p>
      ) : (
        <>
          <RosterTable
            caption="Starters"
            slots={starters}
            playersById={playersById}
            pointsByPlayer={pointsByPlayer}
            projectionsById={projectionsById}
          />
          <RosterTable
            caption="Bench"
            slots={bench}
            playersById={playersById}
            pointsByPlayer={pointsByPlayer}
            projectionsById={projectionsById}
          />
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link className="back-link" to="/">
      ← Standings
    </Link>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="team-stat">
      <div className="team-stat-label">{label}</div>
      <div className={`team-stat-value ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function MatchupSummary({
  matchup,
  teamId,
  teamNamesById,
  week,
}: {
  matchup: WeeklyMatchup;
  teamId: string;
  teamNamesById: Record<string, string>;
  week: number;
}) {
  const isTeamA = matchup.teamA.teamId === teamId;
  const me = isTeamA ? matchup.teamA : matchup.teamB;
  const them = isTeamA ? matchup.teamB : matchup.teamA;
  const oppName = them.teamId ? teamNamesById[them.teamId] ?? them.teamId : "Bye";
  const score = (side: typeof me) => (side.customPoints ?? side.points)?.toFixed(2) ?? "—";

  return (
    <div className="matchup-summary">
      <div className="matchup-summary-line">
        <span className="matchup-summary-score">{score(me)}</span>
        <span className="muted">vs</span>
        <span className="matchup-summary-score">{them.teamId ? score(them) : "—"}</span>
      </div>
      <div className="matchup-summary-opp">
        {them.teamId ? (
          <>
            Opponent: <Link to={`/team/${them.teamId}`}>{oppName}</Link>
          </>
        ) : (
          "Bye week"
        )}
      </div>
      <div>
        <StatusBadge state={matchup.state} />{" "}
        <Link to={`/matchups/${week}/${matchup.matchupId}`}>Full matchup →</Link>
      </div>
    </div>
  );
}

function RosterTable({
  caption,
  slots,
  playersById,
  pointsByPlayer,
  projectionsById,
}: {
  caption: string;
  slots: RosterSlot[];
  playersById: Record<string, PlayerInfo>;
  pointsByPlayer: Map<string, number | null>;
  projectionsById: Record<string, number>;
}) {
  if (slots.length === 0) return null;
  return (
    <section>
      <h3 className="roster-caption">{caption}</h3>
      <table className="roster-table">
        <thead>
          <tr>
            <th scope="col">Slot</th>
            <th scope="col">Player</th>
            <th scope="col">Pos</th>
            <th scope="col">Pts</th>
            <th scope="col">Proj</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, i) => {
            const info = slot.playerId ? playersById[slot.playerId] : undefined;
            const points = slot.playerId ? pointsByPlayer.get(slot.playerId) ?? null : null;
            const projected = slot.playerId ? projectionsById[slot.playerId] : undefined;
            return (
              <tr key={`${slot.slot}-${i}`} className={slot.playerId ? "" : "roster-row-empty"}>
                <td>
                  <span className={`slot-tag slot-${slot.slot.toLowerCase()}`}>{slot.slot}</span>
                </td>
                <td>
                  {slot.playerId ? (
                    <>
                      <div className="player-name">{info?.full_name ?? slot.playerId}</div>
                      {info?.team && <div className="player-team">{info.team}</div>}
                    </>
                  ) : (
                    <span className="muted">Empty</span>
                  )}
                </td>
                <td>{info?.position ?? "—"}</td>
                <td>{points !== null ? points.toFixed(2) : "—"}</td>
                <td>{projected !== undefined ? projected.toFixed(2) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
