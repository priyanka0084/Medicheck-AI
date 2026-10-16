import { describe, it, expect, beforeEach } from "vitest";
import {
  loadCabinet, addMedicine, removeMedicine, statusOf, sortByExpiry,
  filterCabinet, cabinetCounts, cabinetAttentionCount,
} from "../lib/cabinet";

const NOW = new Date("2026-10-15T10:00:00Z");

describe("cabinet.js", () => {
  beforeEach(() => {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
    globalThis.window = { dispatchEvent: () => true };
  });

  it("adds a medicine and normalises the expiry", () => {
    const r = addMedicine({ name: " Paracetamol ", batch: "B1", expiry: "AUG 2027" });
    expect(r.ok).toBe(true);
    expect(r.action).toBe("added");
    expect(loadCabinet()[0]).toMatchObject({ name: "Paracetamol", batch: "B1", expiry: "08/2027" });
  });

  it("requires a name and rejects an expiry it cannot read", () => {
    expect(addMedicine({ name: "  " }).ok).toBe(false);
    const bad = addMedicine({ name: "X", expiry: "someday" });
    expect(bad.ok).toBe(false);
    expect(bad.error).toMatch(/Expiry date not understood/);
    expect(loadCabinet()).toHaveLength(0);
  });

  it("updates instead of duplicating the same name and batch", () => {
    addMedicine({ name: "Paracetamol", batch: "B1", expiry: "08/2027" });
    const r = addMedicine({ name: "paracetamol", batch: "b1", expiry: "09/2027" });
    expect(r.action).toBe("updated");
    expect(loadCabinet()).toHaveLength(1);
    expect(loadCabinet()[0].expiry).toBe("09/2027");
  });

  it("allows a medicine without an expiry date", () => {
    expect(addMedicine({ name: "Vitamin C" }).ok).toBe(true);
    expect(statusOf(loadCabinet()[0], NOW).status).toBe("unknown");
  });

  it("classifies, filters, sorts and counts by expiry", () => {
    addMedicine({ name: "Valid", expiry: "12/2028" });
    addMedicine({ name: "Soon", expiry: "11/2026" });
    addMedicine({ name: "Old", expiry: "01/2026" });
    addMedicine({ name: "NoDate" });
    const items = loadCabinet();

    expect(statusOf(items.find((i) => i.name === "Valid"), NOW).status).toBe("valid");
    expect(statusOf(items.find((i) => i.name === "Soon"), NOW).status).toBe("expiring_soon");
    expect(statusOf(items.find((i) => i.name === "Old"), NOW).status).toBe("expired");

    expect(filterCabinet(items, "expired", NOW).map((i) => i.name)).toEqual(["Old"]);
    expect(filterCabinet(items, "expiring", NOW).map((i) => i.name)).toEqual(["Soon"]);
    expect(filterCabinet(items, "all", NOW)).toHaveLength(4);

    expect(sortByExpiry(items).map((i) => i.name)).toEqual(["Old", "Soon", "Valid", "NoDate"]);
    expect(cabinetCounts(items, NOW)).toEqual({ all: 4, expired: 1, expiring: 1, valid: 1, unknown: 1 });
    expect(cabinetAttentionCount(NOW)).toBe(2);
  });

  it("removes a medicine", () => {
    addMedicine({ name: "A", expiry: "12/2028" });
    const id = loadCabinet()[0].id;
    expect(removeMedicine(id)).toHaveLength(0);
  });

  it("survives unreadable storage", () => {
    globalThis.localStorage.getItem = () => "{not json";
    expect(loadCabinet()).toEqual([]);
  });
});
