import { describe, it, expect } from "vitest";
import { MEDICINES, suggestMedicines, findReference, levenshtein } from "../lib/medicines";
import modelMeta from "../../../backend/model/model_meta.json";

const labels = (r) => r.map((x) => x.value);

describe("medicines.js autocomplete", () => {
  it("every suggestion name is exactly a medicine the trained model knows", () => {
    const known = Object.keys(modelMeta.medicine_stats).sort();
    expect(MEDICINES.map((m) => m.name).sort()).toEqual(known);
  });

  it("empty query lists recent names first, then the whole reference list", () => {
    const r = suggestMedicines("", { recent: ["Dolo 650", "Paracetamol"] });
    expect(r[0]).toMatchObject({ value: "Dolo 650", group: "recent" });
    // "Paracetamol" is already in the reference list so it is not repeated as a recent name
    expect(r.filter((x) => x.group === "recent").length).toBe(1);
    expect(r.filter((x) => x.group === "reference").length).toBe(MEDICINES.length);
  });

  it("finds by prefix, substring and word start", () => {
    expect(labels(suggestMedicines("azith"))[0]).toBe("Azithromycin - 500 mg");
    expect(labels(suggestMedicines("folic"))).toContain("ferrous sulphate with folic acid tablets ip");
  });

  it("tolerates typos", () => {
    expect(labels(suggestMedicines("paracetmol"))).toContain("Paracetamol");
    expect(labels(suggestMedicines("omeprazol"))).toContain("OMEPRAZOLE");
  });

  it("finds medicines by usual spelling or brand, and returns the exact model name", () => {
    expect(labels(suggestMedicines("pantoprazole"))[0]).toBe("Panthaprazole");
    expect(labels(suggestMedicines("loperamide"))[0]).toBe("Lopramide");
    expect(labels(suggestMedicines("intagesic"))[0]).toBe("Diclofenac sodium,paracetamol and chlorzoxazone tablets");
  });

  it("returns nothing for unrelated text (free text is still allowed by the input)", () => {
    expect(suggestMedicines("zzzzqq")).toEqual([]);
  });

  it("limits typed results", () => {
    expect(suggestMedicines("a", { limit: 3 }).length).toBeLessThanOrEqual(3);
  });

  it("findReference mirrors the backend: exact first, then the most specific match", () => {
    expect(findReference("paracetamol")).toBe("Paracetamol"); // not the longer combination products
    expect(findReference("Paracetamol 500mg tablets")).toBe("Paracetamol");
    expect(findReference("Paracetamol modified release")).toBe("Paracetamol modified release tablets");
    MEDICINES.forEach((m) => expect(findReference(m.name)).toBe(m.name));
  });

  it("findReference needs 3+ characters and returns null for unknown text", () => {
    expect(findReference("ab")).toBeNull();
    expect(findReference("zzzqqq")).toBeNull();
    expect(findReference("")).toBeNull();
    expect(findReference("Cetirizine 10mg tablets")).toBeNull(); // only the backend's fuzzy step would match this
  });

  it("levenshtein basics", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
  });
});
