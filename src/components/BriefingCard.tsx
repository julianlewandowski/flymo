import { useState, type ReactNode } from "react";

interface BriefingCardProps {
  title: string;
  /** Short label shown on the right of the header (e.g. phase order). */
  badge?: string;
  accent?: "amber" | "green" | "cyan" | "magenta";
  defaultOpen?: boolean;
  children: ReactNode;
}

const accentText: Record<NonNullable<BriefingCardProps["accent"]>, string> = {
  amber: "text-cockpit-amber",
  green: "text-cockpit-green",
  cyan: "text-cockpit-cyan",
  magenta: "text-cockpit-magenta",
};

/** Collapsible phase card with an EFIS-style header. */
export default function BriefingCard({
  title,
  badge,
  accent = "cyan",
  defaultOpen = true,
  children,
}: BriefingCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-xl border border-cockpit-border bg-cockpit-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cockpit-panelLight"
      >
        <span
          className={`text-sm font-bold uppercase tracking-wider ${accentText[accent]}`}
        >
          {title}
        </span>
        <span className="flex items-center gap-3">
          {badge && (
            <span className="text-[11px] text-cockpit-muted">{badge}</span>
          )}
          <span
            className={`text-cockpit-muted transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▸
          </span>
        </span>
      </button>
      {open && (
        <div className="border-t border-cockpit-border px-4 py-4">{children}</div>
      )}
    </section>
  );
}
