import { useState } from "react";
import type { Briefing, BriefRequest } from "../shared/types.ts";
import { generateBriefing } from "./api.ts";
import BriefingForm from "./components/BriefingForm.tsx";
import BriefingHistory from "./components/BriefingHistory.tsx";
import BriefingView from "./components/BriefingView.tsx";
import {
  addToHistory,
  clearHistory,
  loadHistory,
  removeFromHistory,
  type HistoryEntry,
} from "./lib/history.ts";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  async function handleSubmit(req: BriefRequest) {
    setLoading(true);
    setError(null);
    try {
      const result = await generateBriefing(req);
      setBriefing(result);
      setHistory(addToHistory(result));
    } catch (err) {
      setError((err as Error).message);
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  }

  /** Recall a saved briefing into the main view (no API round-trip). */
  function handleSelectHistory(entry: HistoryEntry) {
    setError(null);
    setBriefing(entry.briefing);
  }

  return (
    <div className="min-h-full bg-cockpit-bg">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-cockpit-amber">
            flymo
          </h1>
          <p className="mt-1 text-sm text-cockpit-muted">
            Takeoff-to-landing performance briefings for flight sim
          </p>
        </header>

        <BriefingForm onSubmit={handleSubmit} loading={loading} />

        {history.length > 0 && (
          <div className="mt-4">
            <BriefingHistory
              entries={history}
              onSelect={handleSelectHistory}
              onRemove={(id) => setHistory(removeFromHistory(id))}
              onClear={() => setHistory(clearHistory())}
            />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-cockpit-border bg-cockpit-panel px-4 py-8 text-cockpit-cyan">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cockpit-cyan" />
            <span className="text-sm uppercase tracking-wider">
              Computing performance…
            </span>
          </div>
        )}

        {briefing && !loading && (
          <div className="mt-6">
            <BriefingView briefing={briefing} />
          </div>
        )}

        <footer className="mt-10 border-t border-cockpit-border pt-4 text-center text-[11px] text-cockpit-muted">
          flymo · For flight simulation use only — not for real-world
          navigation.
        </footer>
      </div>
    </div>
  );
}
