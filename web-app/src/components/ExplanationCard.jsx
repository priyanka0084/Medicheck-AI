import React, { useState } from "react";
import { computePillarStatuses } from "../lib/pillars";

/**
 * ExplanationCard — Human-Friendly Explainable AI Diagnosis.
 * Presents clear, accessible, plain-English reasons that any patient or user can easily understand,
 * while keeping advanced statistical metrics (Z-scores, diverging spectrum) available in an expandable section.
 */
export default function ExplanationCard({ explanation, isGenuine, medicineName }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeGroup, setActiveGroup] = useState("all");

  const features = explanation?.features || explanation?.feature_deviations || [];
  if (!explanation || features.length === 0) {
    return null;
  }

  const top_reasons = explanation.top_reasons || [];
  const note = explanation.note || "";
  const matchedMed = explanation.matched_medicine || medicineName || "this medicine";

  // Compute status for the 4 simple pillars (shared with the PDF report)
  const pillarStatus = computePillarStatuses(features);
  const pillars = {
    color: { label: "Color & Tint", icon: "🎨", status: pillarStatus.color, desc: "Color shade matches authentic pills" },
    shine: { label: "Surface Shine", icon: "✨", status: pillarStatus.shine, desc: "Coating gloss matches authentic pills" },
    texture: { label: "Pill Smoothness", icon: "🔍", status: pillarStatus.texture, desc: "Surface texture is smooth and uniform" },
    reflection: { label: "Light Reflection", icon: "💡", status: pillarStatus.reflection, desc: "Reflection pattern is consistent" },
  };

  // Human-friendly explanations for each pillar
  if (pillars.color.status === "abnormal") {
    pillars.color.desc = "Color shade or tint looks noticeably different from genuine pills";
  } else if (pillars.color.status === "borderline") {
    pillars.color.desc = "Slight color variation detected, but close to acceptable range";
  }

  if (pillars.shine.status === "abnormal") {
    pillars.shine.desc = "Surface coating is unusually dull or excessively shiny";
  } else if (pillars.shine.status === "borderline") {
    pillars.shine.desc = "Surface shine slightly deviates from typical factory coating";
  }

  if (pillars.texture.status === "abnormal") {
    pillars.texture.desc = "Surface appears rough, chalky, or uneven compared to genuine pills";
  } else if (pillars.texture.status === "borderline") {
    pillars.texture.desc = "Minor texture variation detected on the tablet surface";
  }

  if (pillars.reflection.status === "abnormal") {
    pillars.reflection.desc = "Light reflection pattern or glare spots do not match authentic pills";
  }

  const getPillarBadge = (status) => {
    switch (status) {
      case "normal":
        return { text: "✓ Normal", bg: "rgba(0, 168, 107, 0.12)", color: "#007a52", border: "rgba(0, 168, 107, 0.35)" };
      case "borderline":
        return { text: "⚠ Borderline", bg: "rgba(217, 119, 6, 0.12)", color: "#b45309", border: "rgba(217, 119, 6, 0.35)" };
      case "abnormal":
        return { text: "✗ Anomaly", bg: "rgba(224, 40, 74, 0.1)", color: "#c81e40", border: "rgba(224, 40, 74, 0.35)" };
      default:
        return { text: "Checked", bg: "rgba(0, 119, 182, 0.1)", color: "#0077b6", border: "rgba(0, 119, 182, 0.3)" };
    }
  };

  const groups = ["all", "RGB", "Ratios", "HSV", "Intensity", "Texture", "Optical"];
  const filteredFeatures =
    activeGroup === "all" ? features : features.filter((f) => f.group === activeGroup);

  const getStatusColor = (status) => {
    switch (status) {
      case "normal":
        return "#00a86b";
      case "borderline":
        return "#d97706";
      case "abnormal":
        return "#e0284a";
      default:
        return "#0077b6";
    }
  };

  return (
    <div className="explanation-card" style={{ marginTop: "1.5rem" }}>
      {/* Header */}
      <div className="expl-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.2rem" }}>🔬</span>
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#1a2a38", fontWeight: 700 }}>
            {isGenuine ? "Why This Pill Passed Verification" : "Why This Pill Failed Verification"}
          </h3>
        </div>
        <span className="expl-badge">Visual Diagnosis</span>
      </div>

      {/* Formulation Context Banner */}
      {note && (
        <div style={{
          fontSize: "0.82rem",
          color: "#0077b6",
          marginTop: "0.75rem",
          background: "rgba(0, 119, 182, 0.07)",
          padding: "0.5rem 0.85rem",
          borderRadius: "6px",
          border: "1px solid rgba(0, 119, 182, 0.2)",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem"
        }}>
          <span>🎯</span>
          <span><b>Comparison Baseline:</b> {note}</span>
        </div>
      )}

      {/* 4 Everyday Physical Check Pillars */}
      <div style={{ marginTop: "1rem" }}>
        <div style={{ fontSize: "0.78rem", color: "#6b8fa8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>
          Physical Quality Checks
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.6rem" }}>
          {Object.entries(pillars).map(([key, p]) => {
            const badge = getPillarBadge(p.status);
            return (
              <div
                key={key}
                style={{
                  background: p.status === "abnormal" ? "rgba(224, 40, 74, 0.04)" : "#f5f8fb",
                  border: `1px solid ${p.status === "abnormal" ? "rgba(224, 40, 74, 0.35)" : "rgba(0, 119, 182, 0.15)"}`,
                  borderRadius: "8px",
                  padding: "0.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1a2a38", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span>{p.icon}</span> {p.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "10px",
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.text}
                  </span>
                </div>
                <div style={{ fontSize: "0.79rem", color: "#4a6a82", lineHeight: "1.3" }}>
                  {p.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plain English Key Takeaway */}
      <div style={{ marginTop: "1rem" }}>
        {isGenuine ? (
          <div style={{
            background: "rgba(0, 168, 107, 0.07)",
            border: "1px solid rgba(0, 168, 107, 0.3)",
            padding: "0.85rem 1rem",
            borderRadius: "8px",
            fontSize: "0.86rem",
            color: "#1a2a38",
            lineHeight: "1.45"
          }}>
            <div style={{ color: "#007a52", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>✓</span> Standard Manufacturing Match
            </div>
            This tablet matches the physical color tone, surface smoothness, and light reflectance of authentic factory-pressed tablets.
          </div>
        ) : (
          <div style={{
            background: "rgba(224, 40, 74, 0.06)",
            border: "1px solid rgba(224, 40, 74, 0.3)",
            padding: "0.85rem 1rem",
            borderRadius: "8px",
            fontSize: "0.86rem",
            color: "#1a2a38",
            lineHeight: "1.45"
          }}>
            <div style={{ color: "#c81e40", fontWeight: 700, marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>⚠️</span> Specific Reasons for Anomaly:
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {top_reasons.slice(0, 3).map((r, idx) => (
                <li key={idx} style={{ fontSize: "0.84rem", color: "#1a2a38" }}>
                  <b>{r.label || r.feature}:</b> {r.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Expandable Advanced Scientific Section */}
      <div style={{ marginTop: "1.25rem", borderTop: "1px solid rgba(0, 119, 182, 0.15)", paddingTop: "0.75rem" }}>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "#0077b6",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "4px 0",
          }}
        >
          <span>{showAdvanced ? "▼" : "▶"}</span>
          <span>{showAdvanced ? "Hide Detailed Statistical Metrics (Z-Scores)" : "View Detailed Statistical Metrics (Z-Scores & Spectrum)"}</span>
        </button>

        {showAdvanced && (
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1a2a38" }}>
                Feature Deviation Spectrum (Clamped to ±4σ)
              </div>
              <div className="group-tabs" style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                {groups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`group-tab-btn ${activeGroup === g ? "active" : ""}`}
                    onClick={() => setActiveGroup(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Header Axis */}
            <div className="diverging-axis-header">
              <span>-4σ (Deficient)</span>
              <span style={{ color: "#00a86b" }}>0 (Reference Mean)</span>
              <span>+4σ (Elevated)</span>
            </div>

            {/* Rows */}
            <div className="diverging-chart-rows" style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {filteredFeatures.map((f) => {
                const z = Math.max(-4, Math.min(4, f.z || 0));
                const isNegative = z < 0;
                const barWidthPct = (Math.abs(z) / 4) * 50;
                const color = getStatusColor(f.status);

                return (
                  <div key={f.name} className="diverging-row">
                    <div className="d-label" title={`${f.name} (${f.group}): value=${f.value}, ref mean=${f.genuine_mean}`}>
                      <span className="d-name">{f.label || f.name}</span>
                      <span className="d-val">{f.value}</span>
                    </div>

                    <div className="d-track-wrap">
                      <div
                        className="d-normal-band"
                        style={{
                          left: `${50 - (1.65 / 4) * 50}%`,
                          width: `${(3.3 / 4) * 50}%`,
                        }}
                        title="Normal reference range (p5 - p95)"
                      />
                      <div className="d-center-line" />
                      {isNegative ? (
                        <div
                          className="d-bar"
                          style={{
                            right: "50%",
                            width: `${barWidthPct}%`,
                            background: color,
                            borderTopLeftRadius: "3px",
                            borderBottomLeftRadius: "3px",
                          }}
                        />
                      ) : (
                        <div
                          className="d-bar"
                          style={{
                            left: "50%",
                            width: `${barWidthPct}%`,
                            background: color,
                            borderTopRightRadius: "3px",
                            borderBottomRightRadius: "3px",
                          }}
                        />
                      )}
                    </div>

                    <div className="d-z-badge" style={{ color }}>
                      {z > 0 ? `+${z}σ` : `${z}σ`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Honest Scientific Disclaimer */}
      <div className="expl-disclaimer" style={{ marginTop: "1rem", padding: "0.6rem 0.75rem", background: "#f5f8fb", borderRadius: "6px", fontSize: "0.76rem", color: "#6b8fa8", lineHeight: "1.35" }}>
        ⚠️ <b>Note:</b> Compared against genuine reference tablets under controlled optical parameters. This system operates as a computational screening aid and does not constitute a certified pharmaceutical chemical assay.
      </div>
    </div>
  );
}
