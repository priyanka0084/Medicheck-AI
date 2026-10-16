import { describe, it, expect } from "vitest";
import { buildSpokenSummary, splitForSpeech, isSpeechSupported, speak } from "../lib/speech";
import { buildChecklist } from "../lib/verification";

const base = { result: "Genuine", medicine_name: "Paracetamol", batch_id: "INP3233", confidence: 0.88, quality: { ok: true } };
const expiry = { status: "valid", formattedExpiry: "12/2027", message: "Valid (443 days remaining)" };

describe("speech.js", () => {
  it("reads a genuine result with confidence as a percentage", () => {
    const text = buildSpokenSummary({ result: base, checklist: buildChecklist({ result: base, expiryStatus: expiry }) });
    expect(text).toMatch(/looks genuine for Paracetamol/);
    expect(text).toMatch(/Confidence is 88 percent/);
    expect(text).toMatch(/Expiry date: passed/);
    expect(text).toMatch(/not a laboratory test/);
    expect(text).not.toMatch(/\u2014/); // no dashes that voices stumble on
  });

  it("says anomaly for a Fake result and asks to retake for Inconclusive", () => {
    expect(buildSpokenSummary({ result: { ...base, result: "Fake" } })).toMatch(/Anomaly detected/);
    const inc = buildSpokenSummary({ result: { ...base, result: "Inconclusive" } });
    expect(inc).toMatch(/inconclusive/);
    expect(inc).not.toMatch(/Confidence is/);
  });

  it("an expired medicine is spoken as do not use", () => {
    const expired = { status: "expired", formattedExpiry: "01/2024", message: "Expired 600 days ago \u2014 DO NOT USE" };
    const text = buildSpokenSummary({ result: base, checklist: buildChecklist({ result: base, expiryStatus: expired }) });
    expect(text).toMatch(/do not use/i);
    expect(text).not.toMatch(/DO NOT USE/);
  });

  it("returns an empty string without a result", () => {
    expect(buildSpokenSummary({ result: null })).toBe("");
  });

  it("splits text into sentences", () => {
    expect(splitForSpeech("One. Two! Three?  Four")).toEqual(["One.", "Two!", "Three?", "Four"]);
    expect(splitForSpeech("")).toEqual([]);
  });

  it("is safely unsupported outside a browser", () => {
    expect(isSpeechSupported()).toBe(false);
    expect(speak("hello")).toBe(false);
  });
});
