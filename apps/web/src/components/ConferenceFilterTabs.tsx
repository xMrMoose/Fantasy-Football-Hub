export type ConferenceFilter = "ALL" | "AFC" | "NFC";

export function ConferenceFilterTabs({
  value,
  onChange,
}: {
  value: ConferenceFilter;
  onChange: (v: ConferenceFilter) => void;
}) {
  const options: ConferenceFilter[] = ["ALL", "AFC", "NFC"];
  return (
    <div className="tabs" role="tablist" aria-label="Filter by conference">
      {options.map((opt) => (
        <button
          key={opt}
          role="tab"
          aria-selected={value === opt}
          className={value === opt ? "active" : ""}
          onClick={() => onChange(opt)}
        >
          {opt === "ALL" ? "All" : opt}
        </button>
      ))}
    </div>
  );
}
