import { describe, it, expect } from "vitest";
import { filterHistory, sortHistory, countByVerdict, compareScans } from "../lib/historyTools";

const scans = [
  { scan_id: "A1", medicine_name: "Paracetamol", batch_id: "INP1", result: "Genuine", confidence: 0.9, timestamp: "2026-10-01T10:00:00Z",
    quality: { ok: true }, decision_score: 0.2, anomaly_score: -0.1,
    explanation: { features: [{ name: "Mean_R", label: "Red", value: 100, z: 0.2, status: "normal" }, { name: "Glossiness", label: "Glossiness", value: 0.5, z: 0.1, status: "normal" }] } },
  { scan_id: "B2", medicine_name: "Paracetamol", batch_id: "inp1", result: "Fake", confidence: 0.7, timestamp: "2026-10-05T10:00:00Z",
    quality: { ok: false, issues: ["Image too dark"] }, decision_score: -0.3, anomaly_score: 0.2,
    explanation: { features: [{ name: "Mean_R", label: "Red", value: 90, z: -1.0, status: "borderline" }, { name: "Glossiness", label: "Glossiness", value: 0.1, z: -3.5, status: "abnormal" }] } },
  { scan_id: "C3", medicine_name: "Ranitidine", batch_id: "", result: "Inconclusive", confidence: 0.5, timestamp: "2026-10-10T10:00:00Z" },
];

describe("historyTools.js", () => {
  it("searches medicine, batch and scan id with all words required", () => {
    expect(filterHistory(scans, { query: "paracetamol" })).toHaveLength(2);
    expect(filterHistory(scans, { query: "INP1" })).toHaveLength(2); // case-insensitive
    expect(filterHistory(scans, { query: "ranit c3" })).toHaveLength(1);
    expect(filterHistory(scans, { query: "paracetamol zzz" })).toHaveLength(0);
  });

  it("filters by verdict, batch and medicine", () => {
    expect(filterHistory(scans, { verdict: "Fake" }).map((s) => s.scan_id)).toEqual(["B2"]);
    expect(filterHistory(scans, { medicine: "paracetamol", batch: "INP1" })).toHaveLength(2);
    expect(filterHistory(scans, { batch: "NOPE" })).toHaveLength(0);
  });

  it("sorts and counts", () => {
    expect(sortHistory(scans, "newest").map((s) => s.scan_id)).toEqual(["C3", "B2", "A1"]);
    expect(sortHistory(scans, "oldest").map((s) => s.scan_id)).toEqual(["A1", "B2", "C3"]);
    expect(sortHistory(scans, "conf_high")[0].scan_id).toBe("A1");
    expect(sortHistory(scans, "conf_low")[0].scan_id).toBe("C3");
    expect(countByVerdict(scans)).toEqual({ all: 3, Genuine: 1, Fake: 1, Inconclusive: 1 });
  });

  it("compares two scans of the same batch, older as A", () => {
    const c = compareScans(scans[1], scans[0]); // passed in reverse order
    expect(c.a.scan_id).toBe("A1");
    expect(c.b.scan_id).toBe("B2");
    expect(c.sameMedicine).toBe(true);
    expect(c.sameBatch).toBe(true);
    expect(c.notes.join(" ")).toMatch(/same batch/i);
    expect(c.notes.join(" ")).toMatch(/verdicts differ/i);
    expect(c.notes.join(" ")).toMatch(/90% to 70% \(-20 points\)/);
    expect(c.notes.join(" ")).toMatch(/quality warnings/);
    expect(c.rows.find((r) => r.label === "Confidence")).toMatchObject({ a: "90%", b: "70%" });
    expect(c.hasZ).toBe(true);
    expect(c.features[0].name).toBe("Glossiness"); // largest z change first
    expect(c.features[0].deltaZ).toBeCloseTo(-3.6, 5);
  });

  it("explains when medicines or batches differ or are unknown", () => {
    expect(compareScans(scans[0], scans[2]).notes[0]).toMatch(/different medicines/);
    const noBatch = compareScans({ ...scans[0], batch_id: "" }, scans[1]);
    expect(noBatch.sameBatch).toBe(false);
    expect(noBatch.notes[0]).toMatch(/batch number was not recorded/);
    const diffBatch = compareScans(scans[0], { ...scans[1], batch_id: "ZZ9" });
    expect(diffBatch.notes[0]).toMatch(/different batches/);
  });

  it("falls back to raw feature values when no explanation is saved", () => {
    const c = compareScans({ ...scans[0], explanation: undefined, features: { Mean_R: 100 } }, { ...scans[1], explanation: undefined, features: { Mean_R: 90 } });
    expect(c.hasZ).toBe(false);
    expect(c.features[0]).toMatchObject({ name: "Mean_R", delta: -10 });
  });
});
