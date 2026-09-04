import type { AnyState } from "@fantasy/domain";

const LABELS: Record<AnyState, string> = {
  scheduled: "Scheduled",
  live: "Live",
  unofficial: "Matchup Complete",
  final: "Final",
  awaiting_participant: "Awaiting participant",
  source_incomplete: "Data incomplete",
  tied: "Tied — unresolved",
  overridden: "Commissioner override",
  void: "Void",
};

export function StatusBadge({ state }: { state: AnyState }) {
  return (
    <span className={`badge ${state}`} role="status" aria-label={`Status: ${LABELS[state]}`}>
      {LABELS[state]}
    </span>
  );
}
