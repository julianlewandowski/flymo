import type { HistoryEntry } from "../lib/history.ts";

interface BriefingHistoryProps {
  entries: HistoryEntry[];
  /** Recall a saved briefing into the main view. */
  onSelect: (entry: HistoryEntry) => void;
  /** Forget a single saved briefing. */
  onRemove: (id: string) => void;
  /** Forget all saved briefings. */
  onClear: () => void;
}

/** Compact "HH:MM" + relative day label for a saved-at timestamp. */
function when(savedAt: number): string {
  const d = new Date(savedAt);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const today = new Date().toDateString() === d.toDateString();
  return today ? time : `${d.toLocaleDateString()} ${time}`;
}

/**
 * A list of recently generated briefings, recalled from localStorage. Clicking
 * an entry restores it instantly — no API round-trip. Hidden when empty.
 */
export default function BriefingHistory({
  entries,
  onSelect,
  onRemove,
  onClear,
}: BriefingHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-cockpit-border bg-cockpit-panel/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-cockpit-muted">
          Recent briefings
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] uppercase tracking-wider text-cockpit-muted hover:text-red-300"
        >
          Clear all
        </button>
      </div>
      <ul className="space-y-1.5">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(e)}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md border border-cockpit-border bg-cockpit-bg/40 px-3 py-2 text-left transition hover:border-cockpit-cyan/60 hover:bg-cockpit-cyan/10"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-cockpit-green">
                  {e.label || "Briefing"}
                </span>
                <span className="block truncate text-[11px] text-cockpit-muted">
                  {e.summaryLine}
                </span>
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-cockpit-muted/70">
                {when(e.savedAt)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(e.id)}
              aria-label="Remove from history"
              title="Remove from history"
              className="shrink-0 rounded-md border border-cockpit-border px-2 py-2 text-xs text-cockpit-muted transition hover:border-red-400/50 hover:text-red-300"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
