import type { PlayerLineupEntry } from "@fantasy/domain";
import type { PlayerInfo } from "./LineupTable.js";

const SHORT_SLOT: Record<string, string> = {
  FLEX: "FLX",
  DEF: "D/ST",
};

function shortSlot(slot: string): string {
  return SHORT_SLOT[slot] ?? slot;
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
  return (
    <div className={`h2h-info h2h-info-${align}`}>
      <div className="h2h-player-name">{entry ? info?.full_name ?? entry.playerId : "—"}</div>
      {entry && (
        <div className="h2h-player-meta">
          {info?.team ?? "—"}
          {info?.injury_status && <span className="h2h-injury">{info.injury_status}</span>}
        </div>
      )}
    </div>
  );
}

function ScoreCell({ entry }: { entry: PlayerLineupEntry | null }) {
  return <div className="h2h-score">{entry?.points != null ? entry.points.toFixed(2) : "—"}</div>;
}

export interface H2HRow {
  slot: string;
  a: PlayerLineupEntry | null;
  b: PlayerLineupEntry | null;
}

export function HeadToHead({ rows, playersById }: { rows: H2HRow[]; playersById: Record<string, PlayerInfo> }) {
  return (
    <div className="h2h-list">
      {rows.map((row, i) => (
        <div className="h2h-row" key={`${row.slot}-${i}`}>
          <PlayerCell entry={row.a} playersById={playersById} align="left" />
          <ScoreCell entry={row.a} />
          <div className={`h2h-slot slot-${row.slot.toLowerCase()}`}>{shortSlot(row.slot)}</div>
          <ScoreCell entry={row.b} />
          <PlayerCell entry={row.b} playersById={playersById} align="right" />
        </div>
      ))}
    </div>
  );
}
