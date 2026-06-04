interface StatProps {
  label: string;
  value: string | number;
  /** Big readout for headline numbers (V-speeds, N1, fuel flow). */
  big?: boolean;
  accent?: "green" | "amber" | "cyan";
}

const accentText = {
  green: "text-cockpit-green",
  amber: "text-cockpit-amber",
  cyan: "text-cockpit-cyan",
} as const;

/** A single labelled numeric/text readout in the glass-cockpit style. */
export default function Stat({
  label,
  value,
  big = false,
  accent = "green",
}: StatProps) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-cockpit-muted">
        {label}
      </span>
      <span
        className={`${big ? "text-2xl" : "text-base"} font-bold tabular-nums ${accentText[accent]}`}
      >
        {value}
      </span>
    </div>
  );
}
