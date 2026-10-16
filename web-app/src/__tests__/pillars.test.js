import { describe, it, expect } from "vitest";
import { computePillarStatuses, getFeatureCategory } from "../lib/pillars";

describe("pillars.js", () => {
  it("maps features to the four everyday categories", () => {
    expect(getFeatureCategory("Mean_R")).toBe("color");
    expect(getFeatureCategory("Glossiness")).toBe("shine");
    expect(getFeatureCategory("Contrast")).toBe("texture");
    expect(getFeatureCategory("Specular_Ratio")).toBe("reflection");
  });

  it("abnormal beats borderline within a pillar, and untouched pillars stay normal", () => {
    const s = computePillarStatuses([
      { name: "Mean_R", status: "borderline" },
      { name: "Mean_G", status: "abnormal" },
      { name: "Mean_B", status: "borderline" },
      { name: "Contrast", status: "borderline" },
    ]);
    expect(s.color).toBe("abnormal");
    expect(s.texture).toBe("borderline");
    expect(s.shine).toBe("normal");
    expect(s.reflection).toBe("normal");
  });

  it("handles empty input", () => {
    expect(computePillarStatuses()).toEqual({ color: "normal", shine: "normal", texture: "normal", reflection: "normal" });
  });
});
