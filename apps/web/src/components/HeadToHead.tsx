import type { PlayerLineupEntry } from "@fantasy/domain";
import type { PlayerInfo } from "./LineupTable.js";

const SHORT_SLOT: Record<string, string> = {
  FLEX: "FLX",
  DEF: "D/ST",
};

function shortSlot(slot: string): string {
  return SHORT_SLOT[slot] ?? slot;
}

/**
 * "Patrick Mahomes" -> "P. Mahomes" (ESPN/Sleeper style), so the full last
 * name fits the column instead of getting truncated. A team defense's name
 * ("Pittsburgh Steelers") isn't a person's name and several run long enough
 * to truncate anyway, so those show just the team abbreviation instead —
 * which also avoids repeating the same team twice (name line + meta line).
 */
function displayName(fullName: string, team: string | null | undefined, position: string | null | undefined): string {
  if (position === "DEF") return team ?? fullName;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

function PlayerCell({
  entry,
  playersById,
  align,
}: {
  entry: PlayerLineupEntry | null;
  playersById: Record<string, PlayerInfo>;
  align: "left" | "right";
}) {
  const info = entry ? playersById[entry.playerId] : undefined;
  const isDef = info?.position === "DEF";
  const name = entry ? displayName(info?.full_name ?? entry.playerId, info?.team, info?.position) : "—";
  return (
    <div className={`h2h-info h2h-info-${align}`}>
      <div className="h2h-player-name">{name}</div>
      {entry && !isDef && (
        <div className="h2h-player-meta">
          {info?.team ?? "—"}
          {info?.injury_status && <span className="h2h-injury">{info.injury_status}</span>}
        </div>
      )}
    </div>
  );
}

function ScoreCell({ entry, projected }: { entry: PlayerLineupEntry | null; projected: number | undefined }) {
  return (
    <div className="h2h-score">
      <div className="h2h-score-actual">{entry?.points != null ? entry.points.toFixed(2) : "—"}</div>
      {entry && <div className="h2h-score-proj">{projected != null ? projected.toFixed(1) : "—"}</div>}
    </div>
  );
}

export interface H2HRow {
  slot: string;
  a: PlayerLineupEntry | null;
  b: PlayerLineupEntry | null;
}

export function HeadToHead({
  rows,
  playersById,
  projectionsById,
}: {
  rows: H2HRow[];
  playersById: Record<string, PlayerInfo>;
  projectionsById: Record<string, number>;
}) {
  return (
    <div className="h2h-list">
      {rows.map((row, i) => (
        <div className="h2h-row" key={`${row.slot}-${i}`}>
          <PlayerCell entry={row.a} playersById={playersById} align="left" />
          <ScoreCell entry={row.a} projected={row.a ? projectionsById[row.a.playerId] : undefined} />
          <div className={`h2h-slot slot-${row.slot.toLowerCase()}`}>{shortSlot(row.slot)}</div>
          <ScoreCell entry={row.b} projected={row.b ? projectionsById[row.b.playerId] : undefined} />
          <PlayerCell entry={row.b} playersById={playersById} align="right" />
        </div>
      ))}
    </div>
  );
}
