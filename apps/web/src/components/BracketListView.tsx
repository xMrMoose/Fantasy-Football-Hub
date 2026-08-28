import type { PlayoffBracket } from "@fantasy/domain";
import { StatusBadge } from "./StatusBadge.js";

/** Linear, accessible fallback for small screens and assistive technology — the brief requires a non-visual-bracket alternative. */
export function BracketListView({
  bracket,
  teamNamesById,
}: {
  bracket: PlayoffBracket;
  teamNamesById: Record<string, string>;
}) {
  return (
    <ol aria-label={`${bracket.conference} playoff bracket, list view`}>
      {bracket.matchups.map((m, i) => (
        <li key={i}>
          <strong>{m.round}</strong> (week {m.week}):{" "}
          {m.participants
            .map((p) => `#${p.seed ?? "—"} ${p.teamId ? teamNamesById[p.teamId] ?? p.teamId : "TBD"}${p.score !== null ? ` (${p.score.toFixed(2)})` : ""}`)
            .join(" vs. ")}{" "}
          <StatusBadge state={m.provenance === "overridden" ? "overridden" : m.state} />
        </li>
      ))}
    </ol>
  );
}
