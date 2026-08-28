import { useState } from "react";
import type { PlayoffBracket } from "@fantasy/domain";
import { useDataQuery } from "../data/useDataQuery.js";
import { useTeams } from "../data/useTeams.js";
import { BracketView } from "../components/BracketView.js";
import { BracketListView } from "../components/BracketListView.js";
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
      ) : (
        <div className="banner warn">
          Playoff picture — projected from standings as of Week {bracket.data.asOfWeek}. Not yet official; seeding
          locks once Week 14 begins.
        </div>
      )}
      <div className="bracket-desktop">
        <BracketView bracket={bracket.data} teamNamesById={teamNamesById} />
      </div>
      <details>
        <summary>List view (accessible / mobile)</summary>
        <BracketListView bracket={bracket.data} teamNamesById={teamNamesById} />
      </details>
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
