import { useState, type FormEvent } from "react";
import type {
  BriefRequest,
  CruisePreference,
  IfFlightImport,
  RunwayCondition,
} from "../../shared/types.ts";
import { importFromInfiniteFlight } from "../api.ts";

interface BriefingFormProps {
  onSubmit: (req: BriefRequest) => void;
  loading: boolean;
}

/** String-keyed mirror of the form so inputs stay controlled and editable. */
interface FormState {
  departureIcao: string;
  arrivalIcao: string;
  departureRunway: string;
  departureRunwayLengthFt: string;
  departureElevationFt: string;
  arrivalRunway: string;
  arrivalRunwayLengthFt: string;
  arrivalElevationFt: string;
  aircraftType: string;
  airline: string;
  weightTonnes: string;
  oatC: string;
  runwayCondition: RunwayCondition;
  windDirectionDeg: string;
  windSpeedKt: string;
  cruisePreference: CruisePreference;
}

// Sensible defaults so the user can hit "Generate" immediately (LPFR -> EIDW).
const DEFAULTS: FormState = {
  departureIcao: "LPFR",
  arrivalIcao: "EIDW",
  departureRunway: "10",
  departureRunwayLengthFt: "8169",
  departureElevationFt: "24",
  arrivalRunway: "28",
  arrivalRunwayLengthFt: "8652",
  arrivalElevationFt: "242",
  aircraftType: "A330-300",
  airline: "Aer Lingus",
  weightTonnes: "180",
  oatC: "20",
  runwayCondition: "dry",
  windDirectionDeg: "",
  windSpeedKt: "",
  cruisePreference: "economy",
};

const labelCls = "block text-[11px] uppercase tracking-wider text-cockpit-muted";
const inputCls =
  "mt-1 w-full rounded-md border border-cockpit-border bg-cockpit-bg px-3 py-2 text-sm text-cockpit-green " +
  "placeholder:text-cockpit-muted/50 outline-none focus:border-cockpit-cyan focus:ring-1 focus:ring-cockpit-cyan";

function num(v: string): number {
  return Number(v);
}
function optNum(v: string): number | undefined {
  return v.trim() === "" ? undefined : Number(v);
}

/**
 * Overlay an Infinite Flight import onto the form, touching only the fields the
 * API actually returned (everything in IfFlightImport is optional). Numeric
 * fields are stringified to match the controlled-input FormState.
 */
function applyImport(prev: FormState, imp: IfFlightImport): FormState {
  // Only string-valued FormState keys are written here, so a string cast is
  // sound (the select-backed keys are never passed in).
  const next = { ...prev } as Record<keyof FormState, string>;
  const setStr = (key: keyof FormState, v: string | undefined) => {
    if (v != null && v !== "") next[key] = v;
  };
  const setNum = (key: keyof FormState, v: number | undefined) => {
    if (v != null) next[key] = String(v);
  };
  setStr("departureIcao", imp.departureIcao);
  setStr("arrivalIcao", imp.arrivalIcao);
  setStr("departureRunway", imp.departureRunway);
  setStr("arrivalRunway", imp.arrivalRunway);
  setStr("aircraftType", imp.aircraftType);
  setStr("airline", imp.airline);
  setNum("windDirectionDeg", imp.windDirectionDeg);
  setNum("windSpeedKt", imp.windSpeedKt);
  setNum("oatC", imp.oatC);
  return next as FormState;
}

/** One-line summary of what an import filled in, shown back to the user. */
function importSummary(imp: IfFlightImport): string {
  const route = [imp.departureIcao, imp.arrivalIcao].filter(Boolean).join(" → ");
  const parts = [
    [imp.aircraftType, imp.airline].filter(Boolean).join(" · "),
    route,
    imp.callsign,
  ].filter(Boolean);
  const where = imp.sessionName ? ` (${imp.sessionName})` : "";
  return parts.length
    ? `Imported ${parts.join(" · ")}${where}`
    : `Found your flight${where}, but no details were available to import.`;
}

export default function BriefingForm({ onSubmit, loading }: BriefingFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [ifUsername, setIfUsername] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePull() {
    const username = ifUsername.trim();
    if (!username || importing) return;
    setImporting(true);
    setImportError(null);
    setImportNote(null);
    try {
      const imp = await importFromInfiniteFlight(username);
      setForm((prev) => applyImport(prev, imp));
      setImportNote(importSummary(imp));
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    onSubmit({
      departureIcao: form.departureIcao.trim().toUpperCase(),
      arrivalIcao: form.arrivalIcao.trim().toUpperCase(),
      departureRunway: form.departureRunway.trim().toUpperCase(),
      departureRunwayLengthFt: num(form.departureRunwayLengthFt),
      departureElevationFt: optNum(form.departureElevationFt),
      arrivalRunway: form.arrivalRunway.trim().toUpperCase(),
      arrivalRunwayLengthFt: num(form.arrivalRunwayLengthFt),
      arrivalElevationFt: optNum(form.arrivalElevationFt),
      aircraftType: form.aircraftType.trim(),
      airline: form.airline.trim(),
      weightTonnes: num(form.weightTonnes),
      oatC: num(form.oatC),
      runwayCondition: form.runwayCondition,
      windDirectionDeg: optNum(form.windDirectionDeg),
      windSpeedKt: optNum(form.windSpeedKt),
      cruisePreference: form.cruisePreference,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-cockpit-border bg-cockpit-panel p-5 shadow-lg"
    >
      <div className="mb-5 rounded-lg border border-cockpit-border bg-cockpit-bg/40 p-4">
        <label className={labelCls}>Infinite Flight username</label>
        <div className="mt-1 flex gap-2">
          <input
            className={inputCls + " mt-0 flex-1"}
            value={ifUsername}
            onChange={(e) => setIfUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handlePull();
              }
            }}
            placeholder="Your IFC username"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => void handlePull()}
            disabled={importing || ifUsername.trim() === ""}
            className="shrink-0 rounded-md border border-cockpit-cyan/60 px-3 py-2 text-xs font-bold uppercase tracking-wider text-cockpit-cyan transition hover:bg-cockpit-cyan/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? "Pulling…" : "Pull from IF"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-cockpit-muted">
          Spawn in on a live server with a filed flight plan, then prefill the
          form from your active flight.
        </p>
        {importNote && (
          <p className="mt-2 text-[11px] text-cockpit-green">{importNote}</p>
        )}
        {importError && (
          <p className="mt-2 text-[11px] text-red-300">{importError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Departure (ICAO)</label>
          <input
            className={inputCls}
            value={form.departureIcao}
            onChange={(e) => set("departureIcao", e.target.value)}
            placeholder="LPFR"
            required
          />
        </div>
        <div>
          <label className={labelCls}>Arrival (ICAO)</label>
          <input
            className={inputCls}
            value={form.arrivalIcao}
            onChange={(e) => set("arrivalIcao", e.target.value)}
            placeholder="EIDW"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className={labelCls}>Dep RWY</label>
            <input
              className={inputCls}
              value={form.departureRunway}
              onChange={(e) => set("departureRunway", e.target.value)}
              placeholder="10"
              required
            />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>Len ft</label>
            <input
              className={inputCls}
              type="number"
              value={form.departureRunwayLengthFt}
              onChange={(e) => set("departureRunwayLengthFt", e.target.value)}
              required
            />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>Elev ft</label>
            <input
              className={inputCls}
              type="number"
              value={form.departureElevationFt}
              onChange={(e) => set("departureElevationFt", e.target.value)}
              placeholder="opt"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className={labelCls}>Arr RWY</label>
            <input
              className={inputCls}
              value={form.arrivalRunway}
              onChange={(e) => set("arrivalRunway", e.target.value)}
              placeholder="28"
              required
            />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>Len ft</label>
            <input
              className={inputCls}
              type="number"
              value={form.arrivalRunwayLengthFt}
              onChange={(e) => set("arrivalRunwayLengthFt", e.target.value)}
              required
            />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>Elev ft</label>
            <input
              className={inputCls}
              type="number"
              value={form.arrivalElevationFt}
              onChange={(e) => set("arrivalElevationFt", e.target.value)}
              placeholder="opt"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Aircraft type</label>
          <input
            className={inputCls}
            value={form.aircraftType}
            onChange={(e) => set("aircraftType", e.target.value)}
            placeholder="A330-300"
            required
          />
        </div>
        <div>
          <label className={labelCls}>Airline</label>
          <input
            className={inputCls}
            value={form.airline}
            onChange={(e) => set("airline", e.target.value)}
            placeholder="Aer Lingus"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Weight (t)</label>
            <input
              className={inputCls}
              type="number"
              value={form.weightTonnes}
              onChange={(e) => set("weightTonnes", e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>OAT (°C)</label>
            <input
              className={inputCls}
              type="number"
              value={form.oatC}
              onChange={(e) => set("oatC", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Runway cond.</label>
            <select
              className={inputCls}
              value={form.runwayCondition}
              onChange={(e) =>
                set("runwayCondition", e.target.value as RunwayCondition)
              }
            >
              <option value="dry">Dry</option>
              <option value="wet">Wet</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Cruise</label>
            <select
              className={inputCls}
              value={form.cruisePreference}
              onChange={(e) =>
                set("cruisePreference", e.target.value as CruisePreference)
              }
            >
              <option value="economy">Economy M.80</option>
              <option value="fast">Faster M.82</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Wind dir (°)</label>
            <input
              className={inputCls}
              type="number"
              value={form.windDirectionDeg}
              onChange={(e) => set("windDirectionDeg", e.target.value)}
              placeholder="opt"
            />
          </div>
          <div>
            <label className={labelCls}>Wind (kt)</label>
            <input
              className={inputCls}
              type="number"
              value={form.windSpeedKt}
              onChange={(e) => set("windSpeedKt", e.target.value)}
              placeholder="opt"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-md bg-cockpit-amber px-4 py-3 text-sm font-bold uppercase tracking-wider text-cockpit-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Computing…" : "Generate Briefing"}
      </button>
    </form>
  );
}
