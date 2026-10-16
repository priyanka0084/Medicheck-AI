/**
 * Router.jsx  —  Page navigation wrapper
 *
 * Pages:
 *   "landing"   → Landing.jsx  (intro / marketing page)
 *   "scanner"   → App.jsx      (existing scanner — UNCHANGED)
 *   "dashboard" → Dashboard.jsx (analytics)
 *   "history"   → History.jsx   (search, filter, compare scans)
 *   "cabinet"   → Cabinet.jsx   (My Medicines + expiry view)
 *   "help"      → Help.jsx      (FAQ, limits, privacy)
 *
 * This file is the ONLY new file that touches main.jsx.
 * App.jsx, App.css are completely untouched.
 */

import { useState, useEffect } from "react";
import Landing   from "./Landing.jsx";
import App       from "./App.jsx";
import Dashboard from "./Dashboard.jsx";
import History   from "./History.jsx";
import Cabinet   from "./Cabinet.jsx";
import Help      from "./Help.jsx";
import { cabinetAttentionCount } from "./lib/cabinet";
import "./Router.css";
import "./Features.css";

const PAGES = ["landing", "scanner", "history", "cabinet", "dashboard", "help"];

export default function Router() {
  const [page, setPage] = useState("landing");
  const [attention, setAttention] = useState(0);

  // Other parts of the app can switch pages with:
  //   window.dispatchEvent(new CustomEvent("medicheck:navigate", { detail: "history" }))
  useEffect(() => {
    const onNav = (e) => { if (PAGES.includes(e.detail)) setPage(e.detail); };
    window.addEventListener("medicheck:navigate", onNav);
    return () => window.removeEventListener("medicheck:navigate", onNav);
  }, []);

  // Badge on "My Medicines": expired + expiring soon
  useEffect(() => {
    const update = () => setAttention(cabinetAttentionCount());
    update();
    window.addEventListener("storage", update);
    window.addEventListener("medicheck-storage-update", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("medicheck-storage-update", update);
    };
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  /* nav bar injected on top of scanner & dashboard pages */
  const NavBar = () => (
    <nav className="router-nav">
      <div className="rn-logo" onClick={() => setPage("landing")}>
        <span className="rn-hex">⬡</span> SPECTRAAUTH
      </div>
      <div className="rn-links">
        <button
          className={`rn-btn ${page === "landing"   ? "rn-active" : ""}`}
          onClick={() => setPage("landing")}>
          Home
        </button>
        <button
          className={`rn-btn ${page === "scanner"   ? "rn-active" : ""}`}
          onClick={() => setPage("scanner")}>
          🔬 Scanner
        </button>
        <button
          className={`rn-btn ${page === "history"   ? "rn-active" : ""}`}
          onClick={() => setPage("history")}>
          🗂 History
        </button>
        <button
          className={`rn-btn ${page === "cabinet"   ? "rn-active" : ""}`}
          onClick={() => setPage("cabinet")}>
          💊 My Medicines
          {attention > 0 && <span className="rn-badge" aria-label={`${attention} need attention`}>{attention}</span>}
        </button>
        <button
          className={`rn-btn ${page === "dashboard" ? "rn-active" : ""}`}
          onClick={() => setPage("dashboard")}>
          📊 Dashboard
        </button>
        <button
          className={`rn-btn ${page === "help"      ? "rn-active" : ""}`}
          onClick={() => setPage("help")}>
          ❓ Help
        </button>
      </div>
    </nav>
  );

  if (page === "landing") {
    return <Landing onEnter={() => setPage("scanner")} />;
  }

  if (page === "scanner") {
    return (
      <div className="router-page">
        <NavBar />
        {/* App renders its own header too — the router nav sits above it */}
        <App />
      </div>
    );
  }

  if (page === "history") {
    return (
      <div className="router-page">
        <NavBar />
        <History />
      </div>
    );
  }

  if (page === "cabinet") {
    return (
      <div className="router-page">
        <NavBar />
        <Cabinet onScan={() => setPage("scanner")} />
      </div>
    );
  }

  if (page === "help") {
    return (
      <div className="router-page">
        <NavBar />
        <Help />
      </div>
    );
  }

  if (page === "dashboard") {
    return (
      <div className="router-page">
        <NavBar />
        <Dashboard onBack={() => setPage("scanner")} />
      </div>
    );
  }

  return null;
}
