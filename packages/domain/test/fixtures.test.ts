import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SleeperLeagueSchema,
  SleeperRosterSchema,
  SleeperUserSchema,
  SleeperMatchupsResponseSchema,
  SleeperBracketResponseSchema,
} from "../src/sleeperSchemas.js";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures");

function loadFixture(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, relativePath), "utf-8"));
}

describe("contract: fixtures validate against Sleeper schemas", () => {
  it("league fixture", () => {
    expect(() => SleeperLeagueSchema.parse(loadFixture("league/afc-league.json"))).not.toThrow();
  });

  it("rosters fixture", () => {
    expect(() => SleeperRosterSchema.array().parse(loadFixture("rosters/afc-rosters.json"))).not.toThrow();
  });

  it("users fixture", () => {
    expect(() => SleeperUserSchema.array().parse(loadFixture("users/afc-users.json"))).not.toThrow();
  });

  it.each(["preseason", "live", "final", "bye-week", "corrected-score"])("matchups/%s.json", (name) => {
    expect(() => SleeperMatchupsResponseSchema.parse(loadFixture(`matchups/${name}.json`))).not.toThrow();
  });

  it("winners_bracket fixture", () => {
    expect(() => SleeperBracketResponseSchema.parse(loadFixture("winners_bracket/afc.json"))).not.toThrow();
  });

  it("losers_bracket fixture (empty is valid)", () => {
    expect(() => SleeperBracketResponseSchema.parse(loadFixture("losers_bracket/afc.json"))).not.toThrow();
  });

  it("preserves unknown/extra fields via passthrough rather than crashing", () => {
    const withExtra = { ...(loadFixture("league/afc-league.json") as object), unknown_future_field: 123 };
    const parsed = SleeperLeagueSchema.parse(withExtra) as Record<string, unknown>;
    expect(parsed.unknown_future_field).toBe(123);
  });
});
