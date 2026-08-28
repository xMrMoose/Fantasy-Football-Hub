import { NavLink } from "react-router-dom";

// Super Bowl intentionally has no nav entry yet — too early in the season to
// be relevant, but its route/page/backend logic stay fully wired up.
const links = [
  {
    to: "/",
    label: "Standings",
    end: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10" />
        <path d="M12 20V4" />
        <path d="M20 20V14" />
      </svg>
    ),
  },
  {
    to: "/matchups",
    label: "Matchups",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4" />
        <path d="M8 3v4" />
        <path d="M3 11h18" />
      </svg>
    ),
  },
  {
    to: "/playoffs",
    label: "Playoffs",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
        <path d="M8 5H4a1 1 0 0 0-1 1c0 3 2 5 5 5" />
        <path d="M16 5h4a1 1 0 0 1 1 1c0 3-2 5-5 5" />
        <path d="M12 13v3" />
        <path d="M9 20h6" />
        <path d="M10 16h4l1 4H9l1-4Z" />
      </svg>
    ),
  },
];

export function Nav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "active" : "")}>
          {l.icon}
          <span className="label">{l.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
