import type { PlayoffBracket } from "@fantasy/domain";
import { StatusBadge } from "./StatusBadge.js";

const ROUND_LABELS: Record<PlayoffBracket["matchups"][number]["round"], string> = {
  wildcard: "Week 14",
  semifinal: "Week 15",
  championship: "Week 16 — Championship",
};

export function BracketView({
  bracket,
  teamNamesById,
}: {
  bracket: PlayoffBracket;
  teamNamesById: Record<string, string>;
}) {
  const rounds: Array<PlayoffBracket["matchups"][number]["round"]> = ["wildcard", "semifinal", "championship"];

  return (
    <div className="bracket-columns" role="group" aria-label={`${bracket.conference} playoff bracket`}>
      {rounds.map((round) => {
        const matchups = bracket.matchups.filter((m) => m.round === round);
        if (matchups.length === 0) return null;
        return (
          <div className="bracket-round" key={round}>
            <h4>{ROUND_LABELS[round]}</h4>
            {matchups.map((m, i) => (
              <div className="bracket-matchup" key={i}>
                {m.participants.map((p, j) => (
                  <div key={j} style={{ fontWeight: m.winnerTeamId === p.teamId ? 700 : 400 }}>
                    #{p.seed ?? "—"} {p.teamId ? teamNamesById[p.teamId] ?? p.teamId : "TBD"}
                    {p.source === "bye" && " (bye)"}
                    {p.score !== null && <> — {p.score.toFixed(2)}</>}
                  </div>
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
