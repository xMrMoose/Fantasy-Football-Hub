import type { PlayerLineupEntry } from "@fantasy/domain";

export interface PlayerInfo {
  full_name?: string | null;
  team?: string | null;
  position?: string | null;
  injury_status?: string | null;
}

export function LineupTable({
  lineup,
  playersById,
  title,
}: {
  lineup: PlayerLineupEntry[];
  playersById: Record<string, PlayerInfo>;
  title: string;
}) {
  const starters = lineup.filter((p) => p.starter);
  const bench = lineup.filter((p) => !p.starter);

  const rows = (entries: PlayerLineupEntry[]) => (
    <table>
      <thead>
        <tr>
          <th scope="col">Slot</th>
          <th scope="col">Player</th>
          <th scope="col">Team</th>
          <th scope="col">Pos</th>
          <th scope="col">Status</th>
          <th scope="col">Points</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const info = playersById[entry.playerId];
          return (
            <tr key={entry.playerId}>
              <td>{entry.slot}</td>
              <td>{info?.full_name ?? entry.playerId}</td>
              <td>{info?.team ?? "—"}</td>
              <td>{info?.position ?? "—"}</td>
              <td>{info?.injury_status ?? entry.status ?? "—"}</td>
              <td>{entry.points !== null ? entry.points.toFixed(2) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <section>
      <h3>{title}</h3>
      <h4>Starters</h4>
      {starters.length > 0 ? rows(starters) : <p>No starters recorded.</p>}
      <h4>Bench</h4>
      {bench.length > 0 ? rows(bench) : <p>No bench players recorded.</p>}
    </section>
  );
}
