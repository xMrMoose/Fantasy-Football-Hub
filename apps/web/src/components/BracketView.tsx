import type { PlayoffBracket } from "@fantasy/domain";
import { StatusBadge } from "./StatusBadge.js";

const ROUND_LABELS: Record<PlayoffBracket["matchups"][number]["round"], string> = {
  wildcard: "Wild Card",
  semifinal: "Semifinal",
  championship: "Championship",
};

function TeamLine({
  participant,
  teamNamesById,
  isWinner,
}: {
  participant: PlayoffBracket["matchups"][number]["participants"][number];
  teamNamesById: Record<string, string>;
  isWinner: boolean;
}) {
  return (
    <div className={`bracket-team${isWinner ? " winner" : ""}`}>
      <span className="seed-badge">{participant.seed ?? "—"}</span>
      <span className="bracket-team-name">
        {participant.teamId ? teamNamesById[participant.teamId] ?? participant.teamId : "TBD"}
      </span>
      {participant.score !== null && <span className="bracket-team-score">{participant.score.toFixed(2)}</span>}
    </div>
  );
}

export function BracketView({
  bracket,
  teamNamesById,
}: {
  bracket: PlayoffBracket;
  teamNamesById: Record<string, string>;
}) {
  const rounds: Array<PlayoffBracket["matchups"][number]["round"]> = ["wildcard", "semifinal", "championship"];

  return (
    <div
      className={`bracket-columns conf-${bracket.conference.toLowerCase()}`}
      role="group"
      aria-label={`${bracket.conference} playoff bracket`}
    >
      {rounds.map((round) => {
        const matchups = bracket.matchups.filter((m) => m.round === round);
        if (matchups.length === 0) return null;
        const byes = round === "wildcard" ? matchups.filter((m) => m.participants.length === 1) : [];
        const headToHead = matchups.filter((m) => m.participants.length > 1);
        return (
          <div className="bracket-round" key={round}>
            <h4>
              {ROUND_LABELS[round]}
              <span className="bracket-round-week"> · Week {matchups[0].week}</span>
            </h4>
            {byes.length > 0 && (
              <div className="bracket-matchup bracket-bye-group">
                <div className="bracket-bye-label">First-round bye</div>
                {byes.map((m, i) => (
                  <TeamLine key={i} participant={m.participants[0]} teamNamesById={teamNamesById} isWinner={false} />
                ))}
              </div>
            )}
            {headToHead.map((m, i) => (
              <div className="bracket-matchup" key={i}>
                {m.participants.map((p, j) => (
                  <TeamLine key={j} participant={p} teamNamesById={teamNamesById} isWinner={m.winnerTeamId === p.teamId} />
                ))}
                <StatusBadge state={m.provenance === "overridden" ? "overridden" : m.state} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
