import { useEffect, useRef } from "react";

const PLAYOFF_LABELS: Record<number, string> = {
  14: "WC",
  15: "SF",
  16: "CH",
  17: "SB",
};

function weekAriaLabel(w: number): string {
  if (w === 17) return `Week ${w} — Super Bowl`;
  if (w >= 14) return `Week ${w} — Playoffs`;
  return `Week ${w}`;
}

export function WeekSelector({
  week,
  onChange,
  currentWeek,
}: {
  week: number;
  onChange: (week: number) => void;
  /** The NFL's actual current week, if known — marked with a dot so it stays visible while browsing other weeks. */
  currentWeek?: number;
}) {
  const weeks = Array.from({ length: 17 }, (_, i) => i + 1);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [week]);

  return (
    <div className="week-selector" role="tablist" aria-label="Select week">
      {weeks.map((w) => {
        const isActive = w === week;
        const isPlayoff = w >= 14;
        return (
          <button
            key={w}
            ref={isActive ? activeRef : null}
            role="tab"
            aria-selected={isActive}
            aria-label={weekAriaLabel(w)}
            className={`week-chip${isActive ? " active" : ""}${isPlayoff ? " playoff" : ""}`}
            onClick={() => onChange(w)}
          >
            <span className="week-chip-num">{isPlayoff ? PLAYOFF_LABELS[w] : w}</span>
            {w === currentWeek && <span className="week-chip-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
