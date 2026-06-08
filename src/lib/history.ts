import type { Briefing } from "../../shared/types.ts";

/**
 * A briefing the user generated earlier, kept in localStorage so it can be
 * recalled instantly without re-spending an API call. We store the whole
 * briefing plus a few denormalized fields for the list label.
 */
export interface HistoryEntry {
  id: string;
  /** Epoch millis when the briefing was saved. */
  savedAt: number;
  /** Display label, e.g. "A330-300 · Aer Lingus". */
  label: string;
  summaryLine: string;
  briefing: Briefing;
}

const STORAGE_KEY = "flymo.history.v1";
const MAX_ENTRIES = 10;

/** Read the saved history, newest first. Returns [] if absent or corrupt. */
export function loadHistory(): HistoryEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Prepend a briefing to the history (capped at MAX_ENTRIES) and persist it.
 * Returns the new list so callers can update state without re-reading.
 */
export function addToHistory(briefing: Briefing): HistoryEntry[] {
  const entry: HistoryEntry = {
    // Date.now is fine here — ids only need to be unique within the session.
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: Date.now(),
    label: [briefing.aircraft.type, briefing.aircraft.airline]
      .filter(Boolean)
      .join(" · "),
    summaryLine: briefing.summaryLine,
    briefing,
  };
  const next = [entry, ...loadHistory()].slice(0, MAX_ENTRIES);
  persist(next);
  return next;
}

/** Remove a single entry by id and persist the result. */
export function removeFromHistory(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  persist(next);
  return next;
}

/** Clear all saved briefings. */
export function clearHistory(): HistoryEntry[] {
  persist([]);
  return [];
}

function persist(entries: HistoryEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or disabled — recall is a convenience, so fail silently.
  }
}
