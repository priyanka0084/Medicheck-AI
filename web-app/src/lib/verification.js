/**
 * verification.js — Combines every signal the app already produces into one checklist.
 * Pure functions only (no React, no network) so they are easy to unit test.
 *
 * Inputs come from:
 *   - the /predict or /predict-multi response  (result, quality, agreement, batch_id)
 *   - checkExpiryStatus()                       (expiryStatus)
 *   - the batch number scanned from the label   (scannedBatch)
 *
 * This is a screening aid, not a laboratory test, so no single "trust score" is invented:
 * we only count checks that actually produced a verdict.
 */

export const CHECK = {
  PASS: "pass",
  WARN: "warn",
  FAIL: "fail",
  UNKNOWN: "unknown", // information not provided — never counted as pass or fail
};

const BATCH_FORMAT = /^[A-Z0-9][A-Z0-9\-/]{2,17}$/i;

function opticalCheck(result) {
  if (result.result === "Genuine") {
    return { id: "optical", label: "Optical match", status: CHECK.PASS, detail: "Appearance matches the genuine reference profile." };
  }
  if (result.result === "Fake") {
    return { id: "optical", label: "Optical match", status: CHECK.FAIL, detail: "Appearance deviates from the genuine reference profile." };
  }
  return { id: "optical", label: "Optical match", status: CHECK.WARN, detail: "Reading was inconclusive. Retake the photo." };
}

function qualityCheck(result) {
  const q = result.quality;
  if (!q) {
    return { id: "quality", label: "Image quality", status: CHECK.UNKNOWN, detail: "No quality data returned." };
  }
  if (q.ok) {
    return { id: "quality", label: "Image quality", status: CHECK.PASS, detail: "Lighting, focus and framing were acceptable." };
  }
  const issues = Array.isArray(q.issues) && q.issues.length ? q.issues.join(", ") : "Photo quality was low";
  return { id: "quality", label: "Image quality", status: CHECK.WARN, detail: `${issues}. Results may be less reliable.` };
}

function agreementCheck(result) {
  if (typeof result.agreement !== "number") return null; // single-shot scan: not applicable
  const pct = Math.round(result.agreement * 100);
  if (result.agreement >= 0.67) {
    return { id: "agreement", label: "Multi-shot agreement", status: CHECK.PASS, detail: `${pct}% of photos agree on the verdict.` };
  }
  return { id: "agreement", label: "Multi-shot agreement", status: CHECK.WARN, detail: `Only ${pct}% of photos agree. Take clearer photos.` };
}

function expiryCheck(expiryStatus) {
  if (!expiryStatus || expiryStatus.status === "unknown") {
    return { id: "expiry", label: "Expiry date", status: CHECK.UNKNOWN, detail: "Not provided. Scan the label or enter it manually." };
  }
  if (expiryStatus.status === "valid") {
    return { id: "expiry", label: "Expiry date", status: CHECK.PASS, detail: `${expiryStatus.formattedExpiry} — ${expiryStatus.message}` };
  }
  if (expiryStatus.status === "expiring_soon") {
    return { id: "expiry", label: "Expiry date", status: CHECK.WARN, detail: `${expiryStatus.formattedExpiry} — ${expiryStatus.message}` };
  }
  return { id: "expiry", label: "Expiry date", status: CHECK.FAIL, detail: `${expiryStatus.formattedExpiry} — ${expiryStatus.message}` };
}

function batchCheck(result, scannedBatch) {
  const batch = (result.batch_id || "").trim();
  if (!batch) {
    return { id: "batch", label: "Batch number", status: CHECK.UNKNOWN, detail: "Not provided. Scan the label or enter it manually." };
  }
  if (!BATCH_FORMAT.test(batch)) {
    return { id: "batch", label: "Batch number", status: CHECK.WARN, detail: `"${batch}" does not look like a typical batch code. Re-check the label.` };
  }
  if (scannedBatch && scannedBatch.toUpperCase() === batch.toUpperCase()) {
    return { id: "batch", label: "Batch number", status: CHECK.PASS, detail: `${batch} — read from the label.` };
  }
  if (scannedBatch) {
    return { id: "batch", label: "Batch number", status: CHECK.WARN, detail: `Entered "${batch}" differs from the label scan ("${scannedBatch}").` };
  }
  return { id: "batch", label: "Batch number", status: CHECK.PASS, detail: `${batch} — format looks valid (entered manually).` };
}

/**
 * @param {{ result: object|null, expiryStatus?: object|null, scannedBatch?: string|null }} input
 * @returns {{ items: Array, counts: object, level: string, headline: string } | null}
 */
export function buildChecklist({ result, expiryStatus = null, scannedBatch = null } = {}) {
  if (!result) return null;

  const items = [
    opticalCheck(result),
    qualityCheck(result),
    agreementCheck(result),
    expiryCheck(expiryStatus),
    batchCheck(result, scannedBatch),
  ].filter(Boolean);

  const counts = { pass: 0, warn: 0, fail: 0, unknown: 0 };
  items.forEach((i) => { counts[i.status] += 1; });
  counts.total = items.length;
  counts.checked = counts.total - counts.unknown;

  const expired = items.find((i) => i.id === "expiry" && i.status === CHECK.FAIL);
  let level;
  let headline;
  if (expired) {
    level = CHECK.FAIL;
    headline = "Do not use: this medicine is past its expiry date.";
  } else if (counts.fail > 0) {
    level = CHECK.FAIL;
    headline = "Not verified: one or more checks failed.";
  } else if (counts.warn > 0) {
    level = CHECK.WARN;
    headline = "Partly verified: review the warnings below.";
  } else if (counts.pass === 0) {
    level = CHECK.UNKNOWN;
    headline = "Not enough information to verify.";
  } else {
    level = CHECK.PASS;
    headline = "All available checks passed.";
  }

  return { items, counts, level, headline };
}
