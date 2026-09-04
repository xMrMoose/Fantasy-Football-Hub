import { useState } from "react";
import type { PlayoffBracket } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";
import { useTeams } from "../data/useTeams.js";
import { BracketView } from "../components/BracketView.js";
import { FreshnessBanner } from "../components/FreshnessBanner.js";

function ConferenceBracket({ conference }: { conference: "afc" | "nfc" }) {
  const { teamNamesById } = useTeams();
  const bracket = useDataQuery<PlayoffBracket>(`playoffs/bracket-${conference}.json`, (d) => d.matchups.length === 0);

  if (bracket.status === "loading") return <p>Loading…</p>;
  if (bracket.status === "error") return <p>No playoff picture available yet — check back once regular-season games have been played.</p>;
  if (bracket.status === "empty") return <p>No playoff picture available yet — check back once regular-season games have been played.</p>;

  return (
    <div>
      {bracket.data.official ? (
        <div className="banner info">Official bracket — seeding locked after Week 13.</div>
      ) : !bracket.data.hasPlayedGames ? (
        <div className="banner neutral">
          Preseason — no games have been played yet. Seeds below are a placeholder (all teams are tied, so order is
          alphabetical) and will start reflecting real standings once Week 1 results are final.
        </div>
      ) : (
        <div className="banner warn">
          Playoff picture — projected from standings as of Week {bracket.data.asOfWeek}. Not yet official; seeding
          locks once Week 14 begins.
        </div>
      )}
      <BracketView bracket={bracket.data} teamNamesById={teamNamesById} />
    </div>
  );
}

export function Playoffs() {
  const [conference, setConference] = useState<"afc" | "nfc">("afc");
  return (
    <div className="container">
      <h1 className="page-title">Playoffs</h1>
      <FreshnessBanner />
      <div className="tabs" role="tablist" aria-label="Conference">
        {(["afc", "nfc"] as const).map((c) => (
          <button key={c} role="tab" aria-selected={conference === c} className={conference === c ? `active active-${c}` : ""} onClick={() => setConference(c)}>
            {c.toUpperCase()}
          </button>
        ))}
      </div>
      <ConferenceBracket conference={conference} />
    </div>
  );
}
