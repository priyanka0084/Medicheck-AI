import { useState, useEffect, useCallback } from "react";
import { loadHistory, deleteScan, clearHistory, exportHistory } from "./lib/storage";
import { filterHistory, sortHistory, countByVerdict, compareScans, VERDICT_FILTERS } from "./lib/historyTools";
import "./Features.css";

const verdictClass = (r) => (r === "Genuine" ? "v-ok" : r === "Fake" ? "v-bad" : "v-warn");
const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "conf_high", label: "Confidence: high to low" },
  { id: "conf_low", label: "Confidence: low to high" },
];

export default function History() {
  const [list, setList] = useState(() => loadHistory());
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState([]); // up to 2 scan_ids
  const [sameBatchOnly, setSameBatchOnly] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const refresh = useCallback(() => setList(loadHistory()), []);
  useEffect(() => {
    window.addEventListener("storage", refresh);
    window.addEventListener("medicheck-storage-update", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("medicheck-storage-update", refresh);
    };
  }, [refresh]);

  const selectedScans = selected.map((id) => list.find((s) => s.scan_id === id)).filter(Boolean);
  const first = selectedScans.length === 1 ? selectedScans[0] : null;

  const filters = { query, verdict };
  if (first && sameBatchOnly) {
    filters.medicine = first.medicine_name;
    if (first.batch_id) filters.batch = first.batch_id;
  }
  const shown = sortHistory(filterHistory(list, filters), sort);
  const counts = countByVerdict(list);
  const comparison = selectedScans.length === 2 ? compareScans(selectedScans[0], selectedScans[1]) : null;

  const toggle = (id) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 2 ? [...cur, id] : cur));

  const remove = (id) => {
    deleteScan(id);
    setSelected((cur) => cur.filter((x) => x !== id));
    refresh();
  };

  const featureRows = comparison ? (showAllFeatures ? comparison.features : comparison.features.slice(0, 8)) : [];

  return (
    <div className="page-wrap">
      <header className="page-head">
        <h1 className="page-title">🗂 Scan History</h1>
        <p className="page-sub">
          Search your past scans, filter by verdict, and compare two scans side by side.
          <span className="page-lock"> 🔒 Stored on this device only.</span>
        </p>
      </header>

      <section className="panel hx-controls" aria-label="Search and filters">
        <input
          className="inp"
          type="search"
          placeholder="Search by medicine, batch or scan ID"
          aria-label="Search scans"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="hx-filters" role="group" aria-label="Filter by verdict">
          {VERDICT_FILTERS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={verdict === v}
              className={`cab-chip ${verdict === v ? "cab-chip-on" : ""}`}
              onClick={() => setVerdict(v)}
            >
              {v === "all" ? "All" : v} <b>{counts[v]}</b>
            </button>
          ))}
        </div>
        <div className="hx-row">
          <label className="hx-sort">
            Sort
            <select className="inp" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <div className="hx-tools">
            <button type="button" className="link-btn" onClick={exportHistory} disabled={!list.length}>⬇ Export</button>
            <button
              type="button"
              className="link-btn link-danger"
              disabled={!list.length}
              onClick={() => {
                if (window.confirm("Clear all scan history on this device?")) { clearHistory(); setSelected([]); refresh(); }
              }}
            >
              🗑 Clear all
            </button>
          </div>
        </div>
      </section>

      {first && (
        <div className="hx-hint" role="status">
          <span>Select one more scan to compare with <b>{first.medicine_name}</b>{first.batch_id ? ` (batch ${first.batch_id})` : ""}.</span>
          <label className="hx-check">
            <input type="checkbox" checked={sameBatchOnly} onChange={(e) => setSameBatchOnly(e.target.checked)} />
            Show only scans of the same {first.batch_id ? "batch" : "medicine"}
          </label>
        </div>
      )}

      <section className="panel" aria-label="Scans">
        {shown.length === 0 ? (
          <p className="empty">{list.length === 0 ? "No scans yet. Run a scan and it will appear here." : "No scans match your search or filters."}</p>
        ) : (
          <ul className="hx-list">
            {shown.map((s) => {
              const on = selected.includes(s.scan_id);
              const disabled = !on && selected.length >= 2;
              return (
                <li key={s.scan_id} className={`hx-item ${on ? "hx-item-on" : ""}`}>
                  <input
                    type="checkbox"
                    className="hx-pick"
                    checked={on}
                    disabled={disabled}
                    onChange={() => toggle(s.scan_id)}
                    aria-label={`Select scan of ${s.medicine_name} for comparison`}
                  />
                  {s.thumbnail ? <img className="hx-thumb" src={s.thumbnail} alt="" /> : <div className="hx-thumb hx-thumb-empty" aria-hidden="true">💊</div>}
                  <div className="hx-main">
                    <div className="hx-name">{s.medicine_name}</div>
                    <div className="hx-meta">
                      {s.batch_id ? `Batch ${s.batch_id} · ` : ""}
                      {s.timestamp ? new Date(s.timestamp).toLocaleString() : ""} · #{s.scan_id}
                    </div>
                  </div>
                  <div className="hx-right">
                    <span className={`pill ${verdictClass(s.result)}`}>{s.result}</span>
                    <span className="hx-conf">{Math.round((s.confidence || 0) * 100)}%</span>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => remove(s.scan_id)} aria-label="Delete this scan" title="Delete">🗑</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {comparison && (
        <section className="panel cmp" aria-label="Comparison">
          <div className="cmp-head">
            <h2 className="panel-title">Comparison</h2>
            <div className="cmp-head-right">
              <span className={`pill ${comparison.sameBatch ? "v-ok" : "v-warn"}`}>
                {comparison.sameBatch ? "Same batch" : comparison.sameMedicine ? "Different or unknown batch" : "Different medicines"}
              </span>
              <button type="button" className="link-btn" onClick={() => { setSelected([]); setSameBatchOnly(false); }}>Clear comparison</button>
            </div>
          </div>

          <ul className="cmp-notes">
            {comparison.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>

          <div className="cmp-scroll">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Property</span></th>
                  <th scope="col">Scan A (older)</th>
                  <th scope="col">Scan B (newer)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Photo</th>
                  {[comparison.a, comparison.b].map((s) => (
                    <td key={s.scan_id}>{s.thumbnail ? <img className="cmp-thumb" src={s.thumbnail} alt={`Scan ${s.scan_id}`} /> : "-"}</td>
                  ))}
                </tr>
                {comparison.rows.map((r) => (
                  <tr key={r.label} className={r.a !== r.b ? "cmp-diff" : ""}>
                    <th scope="row">{r.label}</th>
                    <td>{r.a}</td>
                    <td>{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comparison.features.length > 0 && (
            <>
              <h3 className="cmp-sub">
                {comparison.hasZ ? "Features that changed most (z-score difference)" : "Features that changed most"}
              </h3>
              <div className="cmp-scroll">
                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th scope="col">Feature</th>
                      <th scope="col">A</th>
                      <th scope="col">B</th>
                      <th scope="col">{comparison.hasZ ? "Change in z" : "Change"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureRows.map((f) => {
                      const change = f.deltaZ !== null ? f.deltaZ : f.delta;
                      return (
                        <tr key={f.name}>
                          <th scope="row">{f.label}</th>
                          <td>{typeof f.aValue === "number" ? Math.round(f.aValue * 1000) / 1000 : "-"}</td>
                          <td>{typeof f.bValue === "number" ? Math.round(f.bValue * 1000) / 1000 : "-"}</td>
                          <td>{change === null ? "-" : `${change > 0 ? "+" : ""}${change.toFixed(2)}`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {comparison.features.length > 8 && (
                <button type="button" className="link-btn" onClick={() => setShowAllFeatures((v) => !v)}>
                  {showAllFeatures ? "Show fewer features" : `Show all ${comparison.features.length} features`}
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
