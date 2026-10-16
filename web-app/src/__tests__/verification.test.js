import { describe, it, expect } from "vitest";
import { buildChecklist, CHECK } from "../lib/verification";

const goodResult = {
  result: "Genuine",
  batch_id: "INP24CT69",
  quality: { ok: true, score: 0.9, issues: [] },
};
const validExpiry = { status: "valid", formattedExpiry: "08/2028", message: "Valid (600 days remaining)" };

const byId = (c, id) => c.items.find((i) => i.id === id);

describe("verification.js checklist", () => {
  it("returns null when there is no result", () => {
    expect(buildChecklist({ result: null })).toBeNull();
    expect(buildChecklist()).toBeNull();
  });

  it("all checks pass for a clean genuine scan with label-read batch", () => {
    const c = buildChecklist({ result: goodResult, expiryStatus: validExpiry, scannedBatch: "INP24CT69" });
    expect(c.level).toBe(CHECK.PASS);
    expect(c.counts.pass).toBe(4);
    expect(c.counts.checked).toBe(4);
    expect(byId(c, "agreement")).toBeUndefined(); // single shot
  });

  it("expired medicine overrides a Genuine optical result", () => {
    const expired = { status: "expired", formattedExpiry: "01/2024", message: "Expired 600 days ago — DO NOT USE" };
    const c = buildChecklist({ result: goodResult, expiryStatus: expired });
    expect(c.level).toBe(CHECK.FAIL);
    expect(c.headline).toMatch(/do not use/i);
  });

  it("Fake result fails the optical check", () => {
    const c = buildChecklist({ result: { ...goodResult, result: "Fake" }, expiryStatus: validExpiry });
    expect(byId(c, "optical").status).toBe(CHECK.FAIL);
    expect(c.level).toBe(CHECK.FAIL);
  });

  it("Inconclusive result and poor quality produce warnings, not failures", () => {
    const c = buildChecklist({
      result: { ...goodResult, result: "Inconclusive", quality: { ok: false, issues: ["Image too dark"] } },
      expiryStatus: validExpiry,
    });
    expect(byId(c, "optical").status).toBe(CHECK.WARN);
    expect(byId(c, "quality").status).toBe(CHECK.WARN);
    expect(byId(c, "quality").detail).toMatch(/too dark/);
    expect(c.level).toBe(CHECK.WARN);
  });

  it("missing expiry and batch are 'unknown' and not counted as checked", () => {
    const c = buildChecklist({ result: { ...goodResult, batch_id: "" }, expiryStatus: null });
    expect(byId(c, "expiry").status).toBe(CHECK.UNKNOWN);
    expect(byId(c, "batch").status).toBe(CHECK.UNKNOWN);
    expect(c.counts.unknown).toBe(2);
    expect(c.counts.checked).toBe(2);
    expect(c.level).toBe(CHECK.PASS);
  });

  it("edited batch that differs from the label scan warns", () => {
    const c = buildChecklist({ result: goodResult, expiryStatus: validExpiry, scannedBatch: "XEB0005" });
    expect(byId(c, "batch").status).toBe(CHECK.WARN);
  });

  it("malformed batch warns", () => {
    const c = buildChecklist({ result: { ...goodResult, batch_id: "??" }, expiryStatus: validExpiry });
    expect(byId(c, "batch").status).toBe(CHECK.WARN);
  });

  it("expiring soon warns", () => {
    const soon = { status: "expiring_soon", formattedExpiry: "11/2026", message: "Expiring soon (in 30 days)" };
    const c = buildChecklist({ result: goodResult, expiryStatus: soon });
    expect(byId(c, "expiry").status).toBe(CHECK.WARN);
  });

  it("multi-shot agreement adds a check and warns when low", () => {
    const hi = buildChecklist({ result: { ...goodResult, agreement: 1 }, expiryStatus: validExpiry });
    const lo = buildChecklist({ result: { ...goodResult, agreement: 0.5 }, expiryStatus: validExpiry });
    expect(byId(hi, "agreement").status).toBe(CHECK.PASS);
    expect(byId(lo, "agreement").status).toBe(CHECK.WARN);
  });
});
