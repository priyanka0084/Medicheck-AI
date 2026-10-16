/**
 * medicines.js — Reference medicine list + autocomplete helpers.
 *
 * `name` is the EXACT name used by the trained model (backend/model/model_meta.json),
 * so choosing a suggestion guarantees the right reference baseline. Some dataset names
 * contain spelling slips (e.g. "Lopramide"); `aka` holds the usual spelling or brand so
 * people can still find them. The input always accepts any free text as well.
 */

export const MEDICINES = [
  { name: "Aciclofenac", aka: ["Aceclofenac"] },
  { name: "Albendazole Tablets IP", aka: ["Zeebee"] },
  { name: "Albendzole - 400 mg", aka: ["Albendazole 400 mg", "Zeebee"] },
  { name: "Amoxycillin & Potassium clavunate - 625 mg", aka: ["Amoxicillin and clavulanate 625 mg"] },
  { name: "Azithromycin - 500 mg", aka: ["Aquris"] },
  { name: "Diclofenac sodium,paracetamol and chlorzoxazone tablets", aka: ["Intagesic-MR"] },
  { name: "Dicyclomine hydrochloride & paracetamol", aka: [] },
  { name: "Lopramide", aka: ["Loperamide"] },
  { name: "Montclukasl & Lcuocetirizine", aka: ["Montelukast and levocetirizine"] },
  { name: "Nimesulide and Paracetamol", aka: [] },
  { name: "Norfloxalin & Bctadex - 400 mg", aka: ["Norfloxacin"] },
  { name: "OMEPRAZOLE", aka: [] },
  { name: "Panthaprazole", aka: ["Pantoprazole"] },
  { name: "Paracetamol", aka: ["Generic Paracetamol"] },
  { name: "Paracetamol modified release tablets", aka: ["Fevanex MR 650"] },
  { name: "Rabeparazole", aka: ["Rabeprazole"] },
  { name: "Ranitidine", aka: ["Zindac"] },
  { name: "cefixim - 200", aka: ["Cefixime 200", "Aquris Cef"] },
  { name: "cetirizine - 10 mg", aka: ["Cetirizine 10 mg"] },
  { name: "ferrous sulphate with folic acid tablets ip", aka: [] },
  { name: "vitamin b complex tabletsnfi 1979", aka: ["Vitamin B complex"] },
];

export const normalize = (s) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function tokenMatches(t, w) {
  if (w.startsWith(t)) return true;
  if (t.length < 4) return false;
  const tol = t.length >= 8 ? 2 : 1;
  return levenshtein(t, w) <= tol || levenshtein(t, w.slice(0, t.length)) <= 1;
}

function scoreText(q, text) {
  const n = normalize(text);
  if (!n) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  const words = n.split(" ");
  if (words.some((w) => w.startsWith(q))) return 80;
  if (n.includes(q)) return 70;
  const qt = q.split(" ");
  if (qt.every((t) => words.some((w) => tokenMatches(t, w)))) {
    return qt.every((t) => words.some((w) => w.startsWith(t))) ? 65 : 40;
  }
  return 0;
}

/**
 * Suggestions for the medicine-name box.
 * Empty query -> the user's recent names first, then the whole reference list.
 * Typed query -> best matches only (typo tolerant, also matches aliases/brands).
 *
 * @param {string} query
 * @param {{ recent?: string[], limit?: number }} [opts]
 * @returns {Array<{ value: string, label: string, sub: string, group: "recent"|"reference" }>}
 */
export function suggestMedicines(query, { recent = [], limit = 8 } = {}) {
  const q = normalize(query);
  const refKeys = new Set(MEDICINES.map((m) => normalize(m.name)));

  const recents = [];
  const seen = new Set();
  recent.forEach((r) => {
    const key = normalize(r);
    if (!key || refKeys.has(key) || seen.has(key)) return;
    seen.add(key);
    recents.push({ value: String(r).trim(), label: String(r).trim(), sub: "", group: "recent" });
  });

  const catalog = MEDICINES.map((m) => ({ value: m.name, label: m.name, sub: m.aka.join(" · "), group: "reference", aka: m.aka }));

  if (!q) return [...recents.slice(0, 3), ...catalog.map(({ aka, ...rest }) => rest)];

  const scored = [];
  recents.forEach((r) => {
    const sc = scoreText(q, r.value);
    if (sc > 0) scored.push({ item: r, score: sc + 1 }); // own names win ties
  });
  catalog.forEach((c) => {
    const nameScore = scoreText(q, c.value);
    const aliasScore = Math.max(0, ...c.aka.map((a) => scoreText(q, a) - 5));
    const sc = Math.max(nameScore, aliasScore);
    if (sc > 0) {
      const { aka, ...rest } = c;
      scored.push({ item: rest, score: sc });
    }
  });

  return scored
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .slice(0, limit)
    .map((x) => x.item);
}

/**
 * Mirrors the backend's matching rules (explanation.py) so the UI can say honestly whether
 * a typed name will find a reference baseline: an exact match wins, otherwise the most
 * specific substring match (either direction). Approximate matching is not mirrored.
 * Returns the reference name or null. Needs 3+ characters to avoid accidental hits.
 */
export function findReference(text) {
  const q = String(text ?? "").trim().toLowerCase();
  if (q.length < 3) return null;

  const exact = MEDICINES.find((m) => m.name.toLowerCase() === q);
  if (exact) return exact.name;

  const candidates = MEDICINES.filter((m) => {
    const k = m.name.toLowerCase();
    return k.includes(q) || q.includes(k);
  });
  if (!candidates.length) return null;
  candidates.sort(
    (a, b) => Math.abs(a.name.length - q.length) - Math.abs(b.name.length - q.length) || a.name.localeCompare(b.name)
  );
  return candidates[0].name;
}
