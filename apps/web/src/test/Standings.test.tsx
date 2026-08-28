import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StandingsTable } from "../components/StandingsTable.js";
import type { StandingsRow } from "@fantasy/domain";

const row = (teamId: string, rank: number): StandingsRow => ({
  teamId,
  conference: "AFC",
  rank,
  wins: 5,
  losses: 2,
  ties: 0,
  winPct: 0.714,
  pointsFor: 900.5,
  pointsAgainst: 800.25,
  pointDiff: 100.25,
  gamesPlayed: 7,
});

describe("StandingsTable", () => {
  it("renders a row per team with the resolved display name", () => {
    render(<StandingsTable rows={[row("AFC-1", 1)]} teamNamesById={{ "AFC-1": "The Champs" }} showConference />);
    expect(screen.getByText("The Champs")).toBeInTheDocument();
    expect(screen.getByText("5-2-0 · 0.714")).toBeInTheDocument();
    expect(screen.getByText("+100.3")).toBeInTheDocument();
  });

  it("shows an empty message when there are no rows", () => {
    render(<StandingsTable rows={[]} teamNamesById={{}} showConference={false} />);
    expect(screen.getByText(/no standings data/i)).toBeInTheDocument();
  });
});
