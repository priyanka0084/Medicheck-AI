/**
 * speech.js — Read-aloud for scan results using the browser's built-in speech synthesis.
 * Nothing is sent anywhere: the browser/OS voice reads the text on the device.
 */

export function isSpeechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

const plain = (s) =>
  String(s ?? "")
    .replace(/[\u2014\u2013]/g, ", ")
    .replace(/DO NOT USE/g, "do not use")
    .replace(/\s+/g, " ")
    .trim();

const STATUS_SPEECH = { pass: "passed", warn: "warning", fail: "failed", unknown: "not provided" };

/**
 * Builds the sentences that are spoken for a result.
 * @param {{ result: object, checklist: object|null }} input
 * @returns {string}
 */
export function buildSpokenSummary({ result, checklist = null }) {
  if (!result) return "";
  const med = result.medicine_name || "this medicine";
  const parts = [];

  if (result.result === "Genuine") {
    parts.push(`The tablet looks genuine for ${med}.`);
  } else if (result.result === "Fake") {
    parts.push(`The tablet looks different from genuine tablets for ${med}. Anomaly detected.`);
  } else {
    parts.push(`The result for ${med} is inconclusive. Please retake the photo.`);
  }

  if (result.result !== "Inconclusive" && typeof result.confidence === "number") {
    parts.push(`Confidence is ${Math.round(result.confidence * 100)} percent.`);
  }

  if (checklist) {
    parts.push(plain(checklist.headline));
    checklist.items.forEach((item) => {
      parts.push(`${item.label}: ${STATUS_SPEECH[item.status]}. ${plain(item.detail)}`);
    });
  }

  parts.push("This is a screening aid, not a laboratory test. If anything looks wrong, keep the pack and ask a pharmacist.");
  return parts.map((p) => (/[.!?]$/.test(p) ? p : `${p}.`)).join(" ");
}

/** Splits text into short sentences; long utterances get cut off by some browsers. */
export function splitForSpeech(text) {
  return String(text ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Starts reading. Returns false when unsupported.
 * @param {string} text
 * @param {{ lang?: string, rate?: number, onEnd?: () => void }} [opts]
 */
export function speak(text, { lang = "en-IN", rate = 0.95, onEnd } = {}) {
  if (!isSpeechSupported()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const sentences = splitForSpeech(text);
  if (!sentences.length) return false;
  sentences.forEach((sentence, i) => {
    const u = new window.SpeechSynthesisUtterance(sentence);
    u.lang = lang;
    u.rate = rate;
    if (i === sentences.length - 1) u.onend = () => onEnd && onEnd();
    u.onerror = () => onEnd && onEnd();
    synth.speak(u);
  });
  return true;
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
