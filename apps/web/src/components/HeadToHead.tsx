import type { PlayerLineupEntry } from "@fantasy/domain";
import type { PlayerInfo } from "./LineupTable.js";

const SHORT_SLOT: Record<string, string> = {
  FLEX: "FLX",
  DEF: "D/ST",
};

function shortSlot(slot: string): string {
  return SHORT_SLOT[slot] ?? slot;
}

function Side({
  entry,
  playersById,
  align,
}: {
  entry: PlayerLineupEntry | null;
  playersById: Record<string, PlayerInfo>;
  align: "left" | "right";
}) {
  const info = entry ? playersById[entry.playerId] : undefined;
  const player = (
    <div className={`h2h-player h2h-player-${align}`}>
      <div className="h2h-player-name">{entry ? info?.full_name ?? entry.playerId : "—"}</div>
      {entry && (
        <div className="h2h-player-meta">
          {info?.team ?? "—"}
          {info?.injury_status && <span className="h2h-injury">{info.injury_status}</span>}
        </div>
      )}
    </div>
  );
  const score = <div className="h2h-score">{entry?.points != null ? entry.points.toFixed(2) : "—"}</div>;

  return align === "left" ? (
    <div className="h2h-side h2h-side-a">
      {player}
      {score}
    </div>
  ) : (
    <div className="h2h-side h2h-side-b">
      {score}
      {player}
    </div>
  );
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
          <Side entry={row.a} playersById={playersById} align="left" />
          <div className="h2h-slot">{shortSlot(row.slot)}</div>
          <Side entry={row.b} playersById={playersById} align="right" />
        </div>
      ))}
    </div>
  );
}
