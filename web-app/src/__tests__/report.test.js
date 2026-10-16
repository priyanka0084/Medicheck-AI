import { describe, it, expect } from "vitest";
import { buildReportModel, createReportDoc, pdfSafe } from "../lib/report";
import { buildChecklist } from "../lib/verification";

const result = {
  scan_id: "AB12CD34",
  timestamp: "2026-10-15T06:00:00Z",
  medicine_name: "Diclofenac sodium, paracetamol",
  batch_id: "INP3233",
  result: "Genuine",
  confidence: 0.912,
  decision_score: 0.12,
  anomaly_score: -0.4,
  model: { condition: "standard", version: "v2.0" },
  quality: { ok: false, score: 0.5, issues: ["Tablet is too small in frame - move closer"] },
  explanation: {
    note: "Compared against genuine reference formulation",
    top_reasons: [],
    features: [
      { name: "Mean_R", label: "Red level", value: 120, z: 1.2, status: "borderline" },
      { name: "Glossiness", label: "Glossiness", value: 0.3, z: -3.4, status: "abnormal" },
      { name: "Contrast", label: "Contrast", value: 0.5, z: 0.1, status: "normal" },
    ],
  },
};
const expiry = { status: "valid", formattedExpiry: "12/2027", message: "Valid (443 days remaining)" };

describe("report.js", () => {
  it("builds a model with sorted deviations, pillars and checklist", () => {
    const checklist = buildChecklist({ result, expiryStatus: expiry });
    const m = buildReportModel({ result, checklist, expiryStatus: expiry, generatedAt: new Date("2026-10-15T07:00:00Z") });
    expect(m.verdict).toBe("Genuine");
    expect(m.verdictLevel).toBe("pass");
    expect(m.deviations[0].label).toBe("Glossiness"); // largest |z| first
    expect(m.pillars.find((p) => p.label === "Surface Shine").status).toBe("abnormal");
    expect(m.checks.length).toBe(4);
    expect(m.meta.find(([k]) => k === "Expiry date")[1]).toMatch(/12\/2027/);
  });

  it("shows confidence as a percentage (API returns 0 to 1)", () => {
    const m = buildReportModel({ result, checklist: null });
    expect(m.scores.find(([k]) => k === "Confidence")[1]).toBe("91%");
  });

  it("marks missing expiry as 'Not provided'", () => {
    const m = buildReportModel({ result: { ...result, batch_id: "" }, checklist: null, expiryStatus: null });
    expect(m.meta.find(([k]) => k === "Expiry date")[1]).toBe("Not provided");
    expect(m.meta.find(([k]) => k === "Batch number")[1]).toBe("Not provided");
  });

  it("throws without a result", () => {
    expect(() => buildReportModel({ result: null })).toThrow();
  });

  it("pdfSafe removes characters the built-in PDF font cannot draw", () => {
    expect(pdfSafe("Valid \u2014 ok \u2713 \u2022")).toBe("Valid - ok ? ?");
  });

  it("renders a real PDF document", () => {
    const checklist = buildChecklist({ result, expiryStatus: expiry });
    const doc = createReportDoc(buildReportModel({ result, checklist, expiryStatus: expiry }));
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
