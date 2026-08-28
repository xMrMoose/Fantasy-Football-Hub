import { useEffect, useState } from "react";
import { loadJson } from "./loadJson.js";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "empty" }
  | { status: "ok"; data: T };

// Session-lived, keyed by path, and covers failures too (most commonly a
// week/bracket file that doesn't exist yet pre-season). Since a page load is
// already the refresh point (see below) rather than polling, a settled
// fetch — success or failure — is good for the rest of the session. This is
// what keeps re-visiting a tab (e.g. swiping back to one) from re-showing a
// loading flash for a result it already has, including "this doesn't exist."
type CachedResult<T> = { ok: true; data: T } | { ok: false; error: string };
const resultCache = new Map<string, CachedResult<unknown>>();

function stateFromCache<T>(relativePath: string, isEmpty: (data: T) => boolean): QueryState<T> | null {
  const result = resultCache.get(relativePath) as CachedResult<T> | undefined;
  if (!result) return null;
  if (!result.ok) return { status: "error", error: result.error };
  return isEmpty(result.data) ? { status: "empty" } : { status: "ok", data: result.data };
}

/** No polling — data only ever changes when a new sync commit is deployed, so a page load is the refresh point. */
export function useDataQuery<T>(relativePath: string, isEmpty: (data: T) => boolean = () => false): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>(() => stateFromCache(relativePath, isEmpty) ?? { status: "loading" });

  useEffect(() => {
    const cached = stateFromCache<T>(relativePath, isEmpty);
    if (cached) {
      setState(cached);
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    loadJson<T>(relativePath)
      .then((data) => {
        resultCache.set(relativePath, { ok: true, data });
        if (cancelled) return;
        setState(isEmpty(data) ? { status: "empty" } : { status: "ok", data });
      })
      .catch((err) => {
        const error = err instanceof Error ? err.message : String(err);
        resultCache.set(relativePath, { ok: false, error });
        if (cancelled) return;
        setState({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [relativePath]);

  return state;
}
