import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/standings", label: "Standings" },
  { to: "/matchups", label: "Matchups" },
  { to: "/playoffs", label: "Playoffs" },
  { to: "/superbowl", label: "Super Bowl" },
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
