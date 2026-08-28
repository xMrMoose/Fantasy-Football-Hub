export function WeekSelector({ week, onChange }: { week: number; onChange: (week: number) => void }) {
  const weeks = Array.from({ length: 17 }, (_, i) => i + 1);
  return (
    <label>
      Week:{" "}
      <select value={week} onChange={(e) => onChange(Number(e.target.value))} aria-label="Select week">
        {weeks.map((w) => (
          <option key={w} value={w}>
            {w <= 13 ? `Week ${w}` : w === 17 ? "Week 17 — Super Bowl" : `Week ${w} — Playoffs`}
          </option>
        ))}
      </select>
    </label>
  );
}
