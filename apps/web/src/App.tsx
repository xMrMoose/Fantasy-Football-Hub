import { useRef } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { Nav } from "./components/Nav.js";
import { SyncStatusPill } from "./components/SyncStatusPill.js";
import { Standings } from "./pages/Standings.js";
import { WeeklyMatchups } from "./pages/WeeklyMatchups.js";
import { MatchupDetail } from "./pages/MatchupDetail.js";
import { Playoffs } from "./pages/Playoffs.js";
import { SuperBowl } from "./pages/SuperBowl.js";
import { TeamDetail } from "./pages/TeamDetail.js";
import { useSwipeTabs } from "./hooks/useSwipeTabs.js";

function ValidatedMatchupDetail() {
  const { week } = useParams<{ week: string }>();
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1 || weekNum > 17) {
    return <Navigate to="/matchups" replace />;
  }
  return <MatchupDetail />;
}

export default function App() {
  const contentRef = useRef<HTMLElement>(null);
  const swipe = useSwipeTabs(contentRef);
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="wordmark">FFB Hub</div>
        <SyncStatusPill />
      </header>
      <main
        className="app-content"
        ref={contentRef}
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <Routes>
          <Route path="/" element={<Standings />} />
          <Route path="/standings" element={<Navigate to="/" replace />} />
          <Route path="/matchups" element={<WeeklyMatchups />} />
          <Route path="/matchups/:week/:matchupId" element={<ValidatedMatchupDetail />} />
          <Route path="/team/:teamId" element={<TeamDetail />} />
          <Route path="/playoffs" element={<Playoffs />} />
          <Route path="/superbowl" element={<SuperBowl />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Nav />
    </div>
  );
}
