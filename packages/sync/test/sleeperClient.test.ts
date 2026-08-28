import { describe, it, expect, vi } from "vitest";
import { SleeperClient } from "../src/sleeperClient.js";

function mockFetch(responses: Array<{ ok: boolean; status?: number; json?: unknown }>) {
  let call = 0;
  return vi.fn(async () => {
    const r = responses[Math.min(call, responses.length - 1)];
    call++;
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 500),
      statusText: r.ok ? "OK" : "Error",
      json: async () => r.json,
    } as Response;
  });
}

describe("SleeperClient", () => {
  it("returns parsed JSON on success", async () => {
    const fetchImpl = mockFetch([{ ok: true, json: { hello: "world" } }]);
    const client = new SleeperClient({ fetchImpl });
    const result = await client.get("/state/nfl");
    expect(result).toEqual({ hello: "world" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fetchImpl = mockFetch([{ ok: false }, { ok: false }, { ok: true, json: { ok: 1 } }]);
    const client = new SleeperClient({ fetchImpl, maxRetries: 3 });
    const result = await client.get("/state/nfl");
    expect(result).toEqual({ ok: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws SleeperRequestError-derived error after exhausting retries", async () => {
    const fetchImpl = mockFetch([{ ok: false, status: 503 }]);
    const client = new SleeperClient({ fetchImpl, maxRetries: 1 });
    await expect(client.get("/state/nfl")).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
