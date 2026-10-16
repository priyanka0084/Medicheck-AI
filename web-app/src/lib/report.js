/**
 * report.js — Client-side PDF verification report.
 * Everything is generated in the browser: no image or result is uploaded anywhere.
 *
 *   buildReportModel()  pure function, turns a scan result into plain data (unit tested)
 *   createReportDoc()   draws that data with jsPDF
 *   downloadReport()    saves the PDF to the user's device
 */
import { jsPDF } from "jspdf";
import { computePillarStatuses, PILLAR_LABELS } from "./pillars";

const STATUS_WORD = { pass: "PASS", warn: "WARNING", fail: "FAIL", unknown: "NOT PROVIDED" };
const PILLAR_WORD = { normal: "Normal", borderline: "Borderline", abnormal: "Anomaly" };
const COLORS = {
  pass: [0, 168, 107],
  warn: [217, 119, 6],
  fail: [224, 40, 74],
  unknown: [107, 143, 168],
  normal: [0, 168, 107],
  borderline: [217, 119, 6],
  abnormal: [224, 40, 74],
  text: [26, 42, 56],
  muted: [107, 143, 168],
  accent: [0, 119, 182],
};

/** jsPDF's built-in fonts only cover Latin-1, so swap or replace anything outside it. */
export function pdfSafe(value) {
  return String(value ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00B7/g, "-")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");
}

function verdictLevel(result) {
  if (result.result === "Genuine") return "pass";
  if (result.result === "Fake") return "fail";
  return "warn";
}

/**
 * @param {{ result: object, checklist: object|null, expiryStatus?: object|null, generatedAt?: Date }} input
 */
export function buildReportModel({ result, checklist = null, expiryStatus = null, generatedAt = new Date() }) {
  if (!result) throw new Error("buildReportModel: result is required");

  const explanation = result.explanation || {};
  const features = explanation.features || explanation.feature_deviations || [];
  const pillarStatus = computePillarStatuses(features);

  const deviations = [...features]
    .filter((f) => typeof f.z === "number")
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    .slice(0, 8)
    .map((f) => ({
      label: f.label || f.name,
      value: f.value,
      z: f.z,
      status: f.status || "normal",
    }));

  const meta = [
    ["Medicine", result.medicine_name || "Not provided"],
    ["Batch number", result.batch_id || "Not provided"],
    ["Expiry date", expiryStatus && expiryStatus.status !== "unknown" ? `${expiryStatus.formattedExpiry} - ${expiryStatus.message}` : "Not provided"],
    ["Scan ID", result.scan_id || "-"],
    ["Scan time", result.timestamp ? new Date(result.timestamp).toLocaleString() : "-"],
    ["Report generated", generatedAt.toLocaleString()],
  ];

  const scores = [
    ["Confidence", typeof result.confidence === "number" ? `${Math.round(result.confidence * 100)}%` : "-"],
    ["Decision score", result.decision_score ?? "-"],
    ["Anomaly score", result.anomaly_score ?? "-"],
    ["Model condition", result.model?.condition || "standard"],
    ["Model version", result.model?.version || "-"],
  ];
  if (typeof result.agreement === "number") {
    scores.push(["Multi-shot agreement", `${Math.round(result.agreement * 100)}%`]);
  }

  return {
    title: "SpectraAuth Verification Report",
    verdict: result.result || "Unknown",
    verdictLevel: verdictLevel(result),
    headline: checklist ? checklist.headline : "",
    checklistLevel: checklist ? checklist.level : "unknown",
    meta,
    scores,
    checks: checklist ? checklist.items : [],
    checksSummary: checklist ? `${checklist.counts.pass} of ${checklist.counts.checked} checks passed` : "",
    baseline: explanation.note || "",
    pillars: Object.keys(PILLAR_LABELS).map((k) => ({ label: PILLAR_LABELS[k], status: pillarStatus[k] })),
    reasons: (explanation.top_reasons || []).slice(0, 3).map((r) => `${r.label || r.feature}: ${r.text}`),
    deviations,
    disclaimer:
      "This report is a screening aid produced by an optical anomaly-detection model trained on genuine tablets only. " +
      "It is not a laboratory test and cannot confirm that a medicine is safe. If anything looks wrong, keep the pack " +
      "and ask a pharmacist or report it to the relevant drug regulator.",
  };
}

export function createReportDoc(model) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 15;
  const PAGE_W = 210;
  const CONTENT_W = PAGE_W - M * 2;
  const BOTTOM = 280;
  let y = M;

  const ensure = (h) => {
    if (y + h > BOTTOM) {
      doc.addPage();
      y = M;
    }
  };

  const write = (str, { size = 10, bold = false, color = COLORS.text, x = M, width = CONTENT_W, gap = 1.5 } = {}) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lineH = size * 0.3528 * 1.35;
    doc.splitTextToSize(pdfSafe(str), width).forEach((line) => {
      ensure(lineH);
      doc.text(line, x, y + size * 0.3528);
      y += lineH;
    });
    y += gap;
  };

  const heading = (str) => {
    ensure(12);
    y += 3;
    write(str.toUpperCase(), { size: 9, bold: true, color: COLORS.accent, gap: 0.5 });
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + CONTENT_W, y);
    y += 2.5;
  };

  // ── Verdict banner ──
  const vc = COLORS[model.verdictLevel];
  doc.setFillColor(...vc);
  doc.rect(0, 0, PAGE_W, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(pdfSafe(model.title), M, 11);
  doc.setFontSize(22);
  doc.text(pdfSafe(model.verdict.toUpperCase()), M, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(pdfSafe(model.meta[0][1]), PAGE_W - M, 24, { align: "right" });
  y = 42;

  if (model.headline) {
    write(model.headline, { size: 11, bold: true, color: COLORS[model.checklistLevel] || COLORS.text, gap: 2 });
  }

  // ── Scan details ──
  heading("Scan details");
  model.meta.forEach(([k, v]) => {
    ensure(6);
    write(k, { size: 9, color: COLORS.muted, width: 40, gap: 0 });
    y -= 9 * 0.3528 * 1.35;
    write(v, { size: 9, x: M + 42, width: CONTENT_W - 42, gap: 1 });
  });

  // ── Model scores ──
  heading("Model scores");
  model.scores.forEach(([k, v]) => {
    write(k, { size: 9, color: COLORS.muted, width: 40, gap: 0 });
    y -= 9 * 0.3528 * 1.35;
    write(String(v), { size: 9, x: M + 42, width: CONTENT_W - 42, gap: 1 });
  });

  // ── Checklist ──
  if (model.checks.length) {
    heading(`Verification checklist (${model.checksSummary})`);
    model.checks.forEach((c) => {
      ensure(14);
      write(STATUS_WORD[c.status], { size: 8, bold: true, color: COLORS[c.status], width: 28, gap: 0 });
      y -= 8 * 0.3528 * 1.35;
      write(c.label, { size: 10, bold: true, x: M + 30, width: CONTENT_W - 30, gap: 0.3 });
      write(c.detail, { size: 9, color: COLORS.muted, x: M + 30, width: CONTENT_W - 30, gap: 2 });
    });
  }

  // ── Physical quality ──
  if (model.baseline || model.pillars.length) {
    heading("Physical quality checks");
    if (model.baseline) write(`Comparison baseline: ${model.baseline}`, { size: 9, color: COLORS.muted, gap: 2 });
    model.pillars.forEach((p) => {
      write(p.label, { size: 9, width: 50, gap: 0 });
      y -= 9 * 0.3528 * 1.35;
      write(PILLAR_WORD[p.status] || p.status, { size: 9, bold: true, color: COLORS[p.status] || COLORS.text, x: M + 52, width: 40, gap: 1 });
    });
  }
  if (model.reasons.length) {
    write("Specific reasons for anomaly:", { size: 9, bold: true, color: COLORS.fail, gap: 0.5 });
    model.reasons.forEach((r) => write(`- ${r}`, { size: 9, x: M + 3, width: CONTENT_W - 3, gap: 0.8 }));
  }

  // ── Statistical deviations ──
  if (model.deviations.length) {
    heading("Largest deviations from the genuine reference (z-scores)");
    const cols = [M, M + 70, M + 105, M + 140];
    ensure(8);
    ["Feature", "Value", "Z-score", "Status"].forEach((h, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(h, cols[i], y + 3);
    });
    y += 6;
    model.deviations.forEach((d) => {
      ensure(6);
      const cells = [d.label, String(d.value), (d.z > 0 ? "+" : "") + Number(d.z).toFixed(2), PILLAR_WORD[d.status] || d.status];
      cells.forEach((cell, i) => {
        doc.setFont("helvetica", i === 3 ? "bold" : "normal");
        doc.setFontSize(9);
        doc.setTextColor(...(i === 3 ? COLORS[d.status] || COLORS.text : COLORS.text));
        doc.text(pdfSafe(cell), cols[i], y + 3);
      });
      y += 5.5;
    });
  }

  // ── Disclaimer ──
  heading("Important");
  write(model.disclaimer, { size: 8.5, color: COLORS.muted });

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text("Generated in your browser - no data was uploaded. Screening aid only.", M, 290);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - M, 290, { align: "right" });
  }

  return doc;
}

export function downloadReport(input) {
  const model = buildReportModel(input);
  const doc = createReportDoc(model);
  const id = (input.result.scan_id || "scan").replace(/[^A-Za-z0-9_-]/g, "");
  doc.save(`SpectraAuth_Report_${id}.pdf`);
}
