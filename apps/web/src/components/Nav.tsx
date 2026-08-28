import { NavLink } from "react-router-dom";

// Super Bowl intentionally has no nav entry yet — too early in the season to
// be relevant, but its route/page/backend logic stay fully wired up.
const links = [
  { to: "/", label: "Standings", end: true },
  { to: "/matchups", label: "Matchups" },
  { to: "/playoffs", label: "Playoffs" },
];

export function Nav() {
  return (
    <nav className="top-nav" aria-label="Primary">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "active" : "")}>
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
