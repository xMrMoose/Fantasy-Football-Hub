import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BracketView } from "../components/BracketView.js";
import type { PlayoffBracket } from "@fantasy/domain";

const bracket: PlayoffBracket = {
  season: "2026",
  conference: "AFC",
  reseed: true,
  official: true,
  asOfWeek: 14,
  hasPlayedGames: true,
  matchups: [
    {
      round: "wildcard",
      week: 14,
      conference: "AFC",
      participants: [{ seed: 3, teamId: "AFC-3", score: 100, source: "auto" }, { seed: 6, teamId: "AFC-6", score: 80, source: "auto" }],
      winnerTeamId: "AFC-3",
      state: "final",
      provenance: "auto",
    },
  ],
};

describe("BracketView", () => {
  it("renders seeds and resolves team display names", () => {
    render(<BracketView bracket={bracket} teamNamesById={{ "AFC-3": "Thunder", "AFC-6": "Lightning" }} />);
    expect(screen.getByText(/Thunder/)).toBeInTheDocument();
    expect(screen.getByText(/Lightning/)).toBeInTheDocument();
  });

  it("marks an overridden matchup with the overridden status", () => {
    const overridden: PlayoffBracket = {
      ...bracket,
      matchups: [{ ...bracket.matchups[0], provenance: "overridden" }],
    };
    render(<BracketView bracket={overridden} teamNamesById={{}} />);
    expect(screen.getByText(/Commissioner override/i)).toBeInTheDocument();
  });

  it("groups the 1 and 2 seed byes together and shows the 3v6 / 4v5 matchups", () => {
    const preseasonBracket: PlayoffBracket = {
      season: "2026",
      conference: "AFC",
      reseed: true,
      official: false,
      asOfWeek: 1,
      hasPlayedGames: false,
      matchups: [
        { round: "wildcard", week: 14, conference: "AFC", participants: [{ seed: 1, teamId: "AFC-1", score: null, source: "bye" }], winnerTeamId: "AFC-1", state: "scheduled", provenance: "auto" },
        { round: "wildcard", week: 14, conference: "AFC", participants: [{ seed: 2, teamId: "AFC-10", score: null, source: "bye" }], winnerTeamId: "AFC-10", state: "scheduled", provenance: "auto" },
        { round: "wildcard", week: 14, conference: "AFC", participants: [{ seed: 3, teamId: "AFC-11", score: null, source: "auto" }, { seed: 6, teamId: "AFC-3", score: null, source: "auto" }], winnerTeamId: null, state: "scheduled", provenance: "auto" },
        { round: "wildcard", week: 14, conference: "AFC", participants: [{ seed: 4, teamId: "AFC-12", score: null, source: "auto" }, { seed: 5, teamId: "AFC-2", score: null, source: "auto" }], winnerTeamId: null, state: "scheduled", provenance: "auto" },
      ],
    };
    const teamNamesById = {
      "AFC-1": "Team One", "AFC-10": "Team Ten", "AFC-11": "Team Eleven",
      "AFC-3": "Team Three", "AFC-12": "Team Twelve", "AFC-2": "Team Two",
    };
    render(<BracketView bracket={preseasonBracket} teamNamesById={teamNamesById} />);
    expect(screen.getByText("First-round bye")).toBeInTheDocument();
    expect(screen.getByText("Team One")).toBeInTheDocument();
    expect(screen.getByText("Team Ten")).toBeInTheDocument();
    expect(screen.getByText("Team Eleven")).toBeInTheDocument();
    expect(screen.getByText("Team Three")).toBeInTheDocument();
    expect(screen.getByText("Team Twelve")).toBeInTheDocument();
    expect(screen.getByText("Team Two")).toBeInTheDocument();
  });
});
