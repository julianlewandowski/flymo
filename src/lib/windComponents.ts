/**
 * Wind-component math for a runway. Pure functions, no UI — the form uses these
 * to show a live headwind/crosswind readout from the wind inputs the user has
 * already entered.
 */

export interface WindComponents {
  /** Positive = headwind, negative = tailwind, in knots (rounded). */
  headwind: number;
  /** Crosswind magnitude in knots (rounded, always >= 0). */
  crosswind: number;
  /** Which side the crosswind comes from, relative to the runway heading. */
  crosswindSide: "left" | "right" | "none";
}

/**
 * Magnetic heading implied by a runway designator (e.g. "10" -> 100°, "28L" ->
 * 280°, "36" -> 360°). Returns null if no leading 1-2 digit number is present.
 */
export function parseRunwayHeading(runway: string): number | null {
  const m = runway.trim().match(/^(\d{1,2})/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1 || n > 36) return null;
  return n * 10;
}

/**
 * Resolve the wind (direction it blows FROM, plus speed) into head/cross
 * components relative to a runway heading. All angles in degrees, speeds in kt.
 */
export function windComponents(
  runwayHeadingDeg: number,
  windDirectionDeg: number,
  windSpeedKt: number,
): WindComponents {
  // Signed angle between wind and runway, normalized to (-180, 180].
  let delta = ((windDirectionDeg - runwayHeadingDeg + 540) % 360) - 180;
  const rad = (delta * Math.PI) / 180;
  const headwind = Math.round(windSpeedKt * Math.cos(rad));
  const crossSigned = windSpeedKt * Math.sin(rad);
  const crosswind = Math.round(Math.abs(crossSigned));
  const crosswindSide =
    crosswind === 0 ? "none" : crossSigned > 0 ? "right" : "left";
  return { headwind, crosswind, crosswindSide };
}

/** A compact human label, e.g. "HW 12 · XW 8 from right" or "TW 4 · XW 0". */
export function describeComponents(c: WindComponents): string {
  const along =
    c.headwind >= 0 ? `HW ${c.headwind}` : `TW ${Math.abs(c.headwind)}`;
  const cross =
    c.crosswindSide === "none"
      ? "XW 0"
      : `XW ${c.crosswind} from ${c.crosswindSide}`;
  return `${along} · ${cross}`;
}
