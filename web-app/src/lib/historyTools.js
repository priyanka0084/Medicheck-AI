/**
 * historyTools.js — Pure helpers for searching, filtering, sorting and comparing saved scans.
 */

const norm = (s) => String(s ?? "").toLowerCase();

export const VERDICT_FILTERS = ["all", "Genuine", "Fake", "Inconclusive"];

/**
 * @param {object[]} list
 * @param {{ query?: string, verdict?: string, batch?: string|null, medicine?: string|null }} f
 */
export function filterHistory(list, { query = "", verdict = "all", batch = null, medicine = null } = {}) {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  return list.filter((s) => {
    if (verdict !== "all" && s.result !== verdict) return false;
    if (batch !== null && norm(s.batch_id).trim() !== norm(batch).trim()) return false;
    if (medicine !== null && norm(s.medicine_name).trim() !== norm(medicine).trim()) return false;
    if (tokens.length) {
      const hay = norm(`${s.medicine_name} ${s.batch_id} ${s.scan_id} ${s.result}`);
      return tokens.every((t) => hay.includes(t));
    }
    return true;
  });
}

const time = (s) => new Date(s.timestamp || 0).getTime();

/** @param {"newest"|"oldest"|"conf_high"|"conf_low"} key */
export function sortHistory(list, key = "newest") {
  const copy = [...list];
  if (key === "oldest") return copy.sort((a, b) => time(a) - time(b));
  if (key === "conf_high") return copy.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  if (key === "conf_low") return copy.sort((a, b) => (a.confidence || 0) - (b.confidence || 0));
  return copy.sort((a, b) => time(b) - time(a));
}

export function countByVerdict(list) {
  const c = { all: list.length, Genuine: 0, Fake: 0, Inconclusive: 0 };
  list.forEach((s) => { if (c[s.result] !== undefined) c[s.result] += 1; });
  return c;
}

const pct = (v) => (typeof v === "number" ? `${Math.round(v * 100)}%` : "-");
const num = (v) => (typeof v === "number" ? String(Math.round(v * 1000) / 1000) : "-");

function qualityText(s) {
  if (!s.quality) return "-";
  if (s.quality.ok) return "Good";
  const issues = Array.isArray(s.quality.issues) && s.quality.issues.length ? s.quality.issues.join(", ") : "Low quality";
  return `Warning: ${issues}`;
}

function featureList(s) {
  const fromExplanation = s.explanation?.features || s.explanation?.feature_deviations;
  if (Array.isArray(fromExplanation) && fromExplanation.length) {
    return fromExplanation.map((f) => ({ name: f.name, label: f.label || f.name, value: f.value, z: f.z, status: f.status }));
  }
  if (s.features && typeof s.features === "object") {
    return Object.entries(s.features).map(([name, value]) => ({ name, label: name, value, z: undefined, status: undefined }));
  }
  return [];
}

/**
 * Compares two saved scans. The older scan is always "A", the newer "B".
 */
export function compareScans(x, y) {
  const [a, b] = time(x) <= time(y) ? [x, y] : [y, x];

  const sameMedicine = norm(a.medicine_name).trim() === norm(b.medicine_name).trim();
  const batchKnown = !!(norm(a.batch_id).trim() && norm(b.batch_id).trim());
  const sameBatch = batchKnown && norm(a.batch_id).trim() === norm(b.batch_id).trim();

  const notes = [];
  if (!sameMedicine) notes.push("These scans are for different medicines, so differences are expected.");
  else if (!batchKnown) notes.push("Same medicine, but a batch number was not recorded for one or both scans.");
  else if (!sameBatch) notes.push(`Same medicine but different batches (${a.batch_id} and ${b.batch_id}).`);
  else notes.push(`Same medicine and same batch (${a.batch_id}).`);

  if (a.result === b.result) {
    notes.push(`Both scans gave the same verdict: ${a.result}.`);
  } else {
    notes.push(`The verdicts differ: scan A was ${a.result} and scan B was ${b.result}. Retake both photos in the same light before trusting either.`);
  }

  if (typeof a.confidence === "number" && typeof b.confidence === "number") {
    const d = Math.round((b.confidence - a.confidence) * 100);
    notes.push(`Confidence went from ${pct(a.confidence)} to ${pct(b.confidence)} (${d > 0 ? "+" : ""}${d} points).`);
  }
  if ((a.quality && !a.quality.ok) || (b.quality && !b.quality.ok)) {
    notes.push("At least one photo had quality warnings, which can change the result.");
  }

  const rows = [
    { label: "Medicine", a: a.medicine_name || "-", b: b.medicine_name || "-" },
    { label: "Batch", a: a.batch_id || "-", b: b.batch_id || "-" },
    { label: "Scanned", a: a.timestamp ? new Date(a.timestamp).toLocaleString() : "-", b: b.timestamp ? new Date(b.timestamp).toLocaleString() : "-" },
    { label: "Verdict", a: a.result || "-", b: b.result || "-" },
    { label: "Confidence", a: pct(a.confidence), b: pct(b.confidence) },
    { label: "Decision score", a: num(a.decision_score), b: num(b.decision_score) },
    { label: "Anomaly score", a: num(a.anomaly_score), b: num(b.anomaly_score) },
    { label: "Image quality", a: qualityText(a), b: qualityText(b) },
    { label: "Model condition", a: a.model?.condition || "-", b: b.model?.condition || "-" },
  ];

  const fa = new Map(featureList(a).map((f) => [f.name, f]));
  const fb = new Map(featureList(b).map((f) => [f.name, f]));
  const names = [...new Set([...fa.keys(), ...fb.keys()])];
  const features = names.map((name) => {
    const x1 = fa.get(name);
    const x2 = fb.get(name);
    const aValue = x1?.value;
    const bValue = x2?.value;
    const hasZ = typeof x1?.z === "number" && typeof x2?.z === "number";
    return {
      name,
      label: x2?.label || x1?.label || name,
      aValue,
      bValue,
      aStatus: x1?.status,
      bStatus: x2?.status,
      deltaZ: hasZ ? x2.z - x1.z : null,
      delta: typeof aValue === "number" && typeof bValue === "number" ? bValue - aValue : null,
    };
  });
  const magnitude = (f) => (f.deltaZ !== null ? Math.abs(f.deltaZ) : f.delta !== null ? Math.abs(f.delta) : 0);
  features.sort((p, q) => magnitude(q) - magnitude(p));

  return { a, b, sameMedicine, sameBatch, batchKnown, notes, rows, features, hasZ: features.some((f) => f.deltaZ !== null) };
}
