import { describe, it, expect, vi } from "vitest";
import { SleeperClient } from "../src/sleeperClient.js";
import { fetchLeaguePayload } from "../src/fetchAll.js";

const league = {
  league_id: "1",
  name: "AFC League",
  season: "2026",
  status: "in_season",
  roster_positions: ["QB", "RB", "WR", "TE", "FLEX", "BN"],
  scoring_settings: { pass_td: 4 },
};
const rosters = [{ roster_id: 1, owner_id: "u1", players: ["p1"], starters: ["p1"] }];
const users = [{ user_id: "u1", display_name: "Jane" }];
const matchupsWeek1 = [{ roster_id: 1, matchup_id: 1, points: 100 }];

function fetchImplFor(path: string) {
  if (path.endsWith("/league/1")) return league;
  if (path.endsWith("/rosters")) return rosters;
  if (path.endsWith("/users")) return users;
  if (path.includes("/matchups/")) return matchupsWeek1;
  if (path.includes("bracket")) return [];
  return {};
}

describe("fetchLeaguePayload", () => {
  it("fetches and validates all required endpoints, never hitting the real network", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      return { ok: true, status: 200, statusText: "OK", json: async () => fetchImplFor(path) } as Response;
    });
    const client = new SleeperClient({ fetchImpl });
    const payload = await fetchLeaguePayload(client, "1", 1);
    expect(payload.league.league_id).toBe("1");
    expect(payload.rosters).toHaveLength(1);
    expect(payload.users).toHaveLength(1);
    expect(payload.matchupsByWeek[1]).toHaveLength(1);
    expect(fetchImpl.mock.calls.some((c) => (c[0] as string).includes("://api.sleeper.app"))).toBe(true);
  });
});
