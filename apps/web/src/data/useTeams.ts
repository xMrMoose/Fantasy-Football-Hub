import { useMemo } from "react";
import type { Team } from "@fantasy/domain";
import { useDataQuery } from "./useDataQuery.js";

export function useTeams() {
  const state = useDataQuery<Team[]>("teams/teams.json", (d) => d.length === 0);
  const teamNamesById = useMemo(() => {
    if (state.status !== "ok") return {};
    return Object.fromEntries(state.data.map((t) => [t.teamId, t.displayName]));
  }, [state]);
  return { state, teamNamesById };
}
