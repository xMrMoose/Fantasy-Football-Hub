import { useEffect, useState } from "react";
import { loadJson } from "./loadJson.js";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "empty" }
  | { status: "ok"; data: T };

/** No polling — data only ever changes when a new sync commit is deployed, so a page load is the refresh point. */
export function useDataQuery<T>(relativePath: string, isEmpty: (data: T) => boolean = () => false): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loadJson<T>(relativePath)
      .then((data) => {
        if (cancelled) return;
        setState(isEmpty(data) ? { status: "empty" } : { status: "ok", data });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [relativePath]);

  return state;
}
