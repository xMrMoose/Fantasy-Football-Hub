import type { StandingsRow } from "@fantasy/domain";

export function StandingsTable({
  rows,
  teamNamesById,
  showConference,
}: {
  rows: StandingsRow[];
  teamNamesById: Record<string, string>;
  showConference: boolean;
}) {
  if (rows.length === 0) {
    return <p>No standings data yet.</p>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Team</th>
          {showConference && <th scope="col">Conf</th>}
          <th scope="col">W-L-T</th>
          <th scope="col">Win %</th>
          <th scope="col">PF</th>
          <th scope="col">PA</th>
          <th scope="col">Diff</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.teamId}>
            <td>{row.rank}</td>
            <td>{teamNamesById[row.teamId] ?? row.teamId}</td>
            {showConference && (
              <td className={row.conference === "AFC" ? "conf-afc" : "conf-nfc"}>{row.conference}</td>
            )}
            <td>
              {row.wins}-{row.losses}-{row.ties}
            </td>
            <td>{row.winPct.toFixed(3)}</td>
            <td>{row.pointsFor.toFixed(2)}</td>
            <td>{row.pointsAgainst.toFixed(2)}</td>
            <td>{row.pointDiff.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
