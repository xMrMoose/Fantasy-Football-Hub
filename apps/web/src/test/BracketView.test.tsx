import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BracketView } from "../components/BracketView.js";
import type { PlayoffBracket } from "@fantasy/domain";

const bracket: PlayoffBracket = {
  season: "2026",
  conference: "AFC",
  reseed: true,
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
});
