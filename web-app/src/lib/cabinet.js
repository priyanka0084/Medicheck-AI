/**
 * cabinet.js — "My Medicines": a private list of medicines with expiry dates.
 * Stored only in this browser (localStorage). No server, no notifications:
 * the list simply shows what is expired or expiring soon whenever the app is opened.
 */
import { checkExpiryStatus, parseExpiryDate } from "./expiry";

const KEY = "medicheck.cabinet.v1";
const MAX_ITEMS = 200;

export function loadCabinet() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("medicheck-storage-update"));
  } catch (err) {
    console.warn("[Cabinet] Could not save:", err);
  }
}

const sameKey = (a, b) =>
  a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
  (a.batch || "").trim().toLowerCase() === (b.batch || "").trim().toLowerCase();

/**
 * Adds a medicine, or updates the expiry if the same name + batch already exists.
 * @returns {{ ok: true, items: object[], action: "added"|"updated" } | { ok: false, error: string }}
 */
export function addMedicine({ name, batch = "", expiry = "", source = "manual" }) {
  const cleanName = String(name ?? "").trim();
  if (!cleanName) return { ok: false, error: "Please enter the medicine name." };

  let expiryDisplay = "";
  const rawExpiry = String(expiry ?? "").trim();
  if (rawExpiry) {
    const parsed = parseExpiryDate(rawExpiry);
    if (!parsed.isValidFormat) {
      return { ok: false, error: "Expiry date not understood. Try 08/2027, AUG 2027 or 31/08/2027." };
    }
    expiryDisplay = parsed.display;
  }

  const record = { name: cleanName, batch: String(batch ?? "").trim(), expiry: expiryDisplay };
  const items = loadCabinet();
  const idx = items.findIndex((it) => sameKey(it, record));

  let action;
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...record };
    action = "updated";
  } else {
    items.unshift({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...record,
      source,
      addedAt: new Date().toISOString(),
    });
    if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
    action = "added";
  }
  persist(items);
  return { ok: true, items, action };
}

export function removeMedicine(id) {
  const items = loadCabinet().filter((it) => it.id !== id);
  persist(items);
  return items;
}

export function statusOf(item, now = new Date()) {
  return checkExpiryStatus(item.expiry || "", now);
}

const expiryTime = (item) => {
  const p = parseExpiryDate(item.expiry || "");
  return p.date ? p.date.getTime() : Infinity;
};

/** Soonest expiry first (expired items on top); items with no date go last. */
export function sortByExpiry(items) {
  return [...items].sort((a, b) => expiryTime(a) - expiryTime(b));
}

/** @param {"all"|"expiring"|"expired"} view */
export function filterCabinet(items, view, now = new Date()) {
  if (view === "expired") return items.filter((i) => statusOf(i, now).status === "expired");
  if (view === "expiring") return items.filter((i) => statusOf(i, now).status === "expiring_soon");
  return items;
}

export function cabinetCounts(items, now = new Date()) {
  const c = { all: items.length, expired: 0, expiring: 0, valid: 0, unknown: 0 };
  items.forEach((i) => {
    const s = statusOf(i, now).status;
    if (s === "expired") c.expired += 1;
    else if (s === "expiring_soon") c.expiring += 1;
    else if (s === "valid") c.valid += 1;
    else c.unknown += 1;
  });
  return c;
}

/** Number shown on the nav badge: expired + expiring soon. */
export function cabinetAttentionCount(now = new Date()) {
  const c = cabinetCounts(loadCabinet(), now);
  return c.expired + c.expiring;
}
