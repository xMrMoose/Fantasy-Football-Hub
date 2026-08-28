import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { Nav } from "./components/Nav.js";
import { Home } from "./pages/Home.js";
import { Standings } from "./pages/Standings.js";
import { WeeklyMatchups } from "./pages/WeeklyMatchups.js";
import { MatchupDetail } from "./pages/MatchupDetail.js";
import { Playoffs } from "./pages/Playoffs.js";
import { SuperBowl } from "./pages/SuperBowl.js";

function ValidatedMatchupDetail() {
  const { week } = useParams<{ week: string }>();
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1 || weekNum > 17) {
    return <Navigate to="/matchups" replace />;
  }
  return <MatchupDetail />;
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/standings" element={<Standings />} />
        <Route path="/matchups" element={<WeeklyMatchups />} />
        <Route path="/matchups/:week/:matchupId" element={<ValidatedMatchupDetail />} />
        <Route path="/playoffs" element={<Playoffs />} />
        <Route path="/superbowl" element={<SuperBowl />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
