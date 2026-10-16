import { useState, useEffect, useCallback } from "react";
import MedicineInput from "./components/MedicineInput";
import { loadCabinet, addMedicine, removeMedicine, statusOf, sortByExpiry, filterCabinet, cabinetCounts } from "./lib/cabinet";
import { parseExpiryDate } from "./lib/expiry";
import { loadHistory } from "./lib/storage";
import "./Features.css";

const VIEWS = [
  { id: "all", label: "All" },
  { id: "expiring", label: "Expiring soon" },
  { id: "expired", label: "Expired" },
];

export default function Cabinet({ onScan }) {
  const [items, setItems] = useState(() => loadCabinet());
  const [view, setView] = useState("all");
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const refresh = useCallback(() => setItems(loadCabinet()), []);
  useEffect(() => {
    window.addEventListener("storage", refresh);
    window.addEventListener("medicheck-storage-update", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("medicheck-storage-update", refresh);
    };
  }, [refresh]);

  const now = new Date();
  const counts = cabinetCounts(items, now);
  const shown = sortByExpiry(filterCabinet(items, view, now));
  const recentNames = [...new Set([...loadHistory().map((s) => s.medicine_name), ...items.map((i) => i.name)].filter(Boolean))].slice(0, 8);
  const parsedExpiry = expiry.trim() ? parseExpiryDate(expiry) : null;

  const submit = (e) => {
    e.preventDefault();
    const res = addMedicine({ name, batch, expiry, source: "manual" });
    if (!res.ok) {
      setError(res.error);
      setNotice(null);
      return;
    }
    setError(null);
    setNotice(res.action === "updated" ? "Updated the existing entry for this medicine and batch." : "Added to your cabinet.");
    setName(""); setBatch(""); setExpiry("");
    setItems(res.items);
  };

  const remove = (item) => {
    if (window.confirm(`Remove ${item.name} from your cabinet?`)) setItems(removeMedicine(item.id));
  };

  return (
    <div className="page-wrap">
      <header className="page-head">
        <h1 className="page-title">💊 My Medicines</h1>
        <p className="page-sub">
          Keep track of the medicines you have at home and see at a glance what is expired or about to expire.
          The app cannot send notifications on its own, so check this page when you open the app.
          <span className="page-lock"> 🔒 Saved on this device only.</span>
        </p>
      </header>

      <div className="cab-summary" role="tablist" aria-label="Filter medicines">
        {VIEWS.map((v) => {
          const n = v.id === "all" ? counts.all : v.id === "expired" ? counts.expired : counts.expiring;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              className={`cab-chip cab-chip-${v.id} ${view === v.id ? "cab-chip-on" : ""}`}
              onClick={() => setView(v.id)}
            >
              {v.label} <b>{n}</b>
            </button>
          );
        })}
      </div>

      <section className="panel" aria-label="Medicines list">
        {shown.length === 0 ? (
          <p className="empty">
            {items.length === 0
              ? "Your cabinet is empty. Add a medicine below, or save one from a scan result."
              : "Nothing in this view right now."}
          </p>
        ) : (
          <ul className="cab-list">
            {shown.map((item) => {
              const st = statusOf(item, now);
              return (
                <li key={item.id} className={`cab-item cab-status-${st.status}`}>
                  <div className="cab-item-main">
                    <div className="cab-item-name">{item.name}</div>
                    <div className="cab-item-meta">
                      {item.batch ? `Batch ${item.batch} · ` : ""}
                      {item.expiry ? `Expiry ${item.expiry}` : "No expiry date saved"}
                    </div>
                    <div className="cab-item-state">
                      {st.status === "unknown" ? "Add an expiry date to track this medicine" : st.message}
                    </div>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => remove(item)} aria-label={`Remove ${item.name}`} title="Remove">
                    🗑
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel" aria-label="Add a medicine">
        <h2 className="panel-title">Add a medicine</h2>
        <form className="cab-form" onSubmit={submit}>
          <label className="lbl">
            Medicine name<span className="star">*</span>
            <MedicineInput value={name} onChange={setName} recentNames={recentNames} placeholder="Type or pick a medicine" showNote={false} />
          </label>
          <label className="lbl">
            Batch number (optional)
            <input className="inp" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. INP24CT69" />
          </label>
          <label className="lbl">
            Expiry date
            <input className="inp" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="e.g. 08/2027 or AUG 2027" />
            {parsedExpiry && (
              <span className={parsedExpiry.isValidFormat ? "hint-ok" : "hint-bad"}>
                {parsedExpiry.isValidFormat ? `✓ Understood as ${parsedExpiry.display}` : "Not understood. Try 08/2027, AUG 2027 or 31/08/2027."}
              </span>
            )}
          </label>
          {error && <div className="err-box" role="alert">{error}</div>}
          {notice && <div className="notice-ok" role="status">{notice}</div>}
          <div className="cab-form-actions">
            <button type="submit" className="pdf-btn" style={{ marginTop: 0 }}>Add to cabinet</button>
            {onScan && <button type="button" className="link-btn" onClick={onScan}>Go to scanner →</button>}
          </div>
        </form>
      </section>
    </div>
  );
}
