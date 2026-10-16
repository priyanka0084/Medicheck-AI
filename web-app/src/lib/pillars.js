/**
 * pillars.js — Groups the 17 optical features into 4 everyday physical checks.
 * Shared by the on-screen ExplanationCard and the PDF report so both always agree.
 */

const COLOR_FEATURES = ["Mean_R", "Mean_G", "Mean_B", "R_G_Ratio", "G_B_Ratio", "R_B_Ratio", "Mean_H", "Mean_S"];
const TEXTURE_FEATURES = ["Contrast", "Homogeneity", "Std_Intensity"];

export const PILLAR_LABELS = {
  color: "Color & Tint",
  shine: "Surface Shine",
  texture: "Pill Smoothness",
  reflection: "Light Reflection",
};

export function getFeatureCategory(name) {
  if (COLOR_FEATURES.includes(name)) return "color";
  if (name === "Glossiness") return "shine";
  if (TEXTURE_FEATURES.includes(name)) return "texture";
  return "reflection";
}

/**
 * @param {Array<{name: string, status?: string}>} features
 * @returns {{color: string, shine: string, texture: string, reflection: string}}
 *   each value is "normal" | "borderline" | "abnormal"
 */
export function computePillarStatuses(features = []) {
  const out = { color: "normal", shine: "normal", texture: "normal", reflection: "normal" };
  features.forEach((f) => {
    const cat = getFeatureCategory(f.name);
    if (f.status === "abnormal") {
      out[cat] = "abnormal";
    } else if (f.status === "borderline" && out[cat] !== "abnormal") {
      out[cat] = "borderline";
    }
  });
  return out;
}
