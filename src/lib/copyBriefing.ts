import type { Briefing } from "../../shared/types.ts";

/**
 * A filesystem-safe filename for downloading a briefing, derived from the
 * route and aircraft (e.g. "flymo-LPFR-EIDW-A330-300.txt"). Falls back to a
 * generic name if the briefing is missing those fields.
 */
export function briefingFilename(b: Briefing): string {
  const slug = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const route = b.summaryLine.match(/\b([A-Z]{4})\b.*?\b([A-Z]{4})\b/);
  const parts = [
    "flymo",
    route ? `${route[1]}-${route[2]}` : "",
    slug(b.aircraft.type),
  ].filter(Boolean);
  return `${parts.join("-") || "flymo-briefing"}.txt`;
}

/** Render a briefing as a plain-text block for the "Copy briefing" button. */
export function briefingToText(b: Briefing): string {
  const L: string[] = [];
  L.push("flymo — flight-sim briefing");
  L.push(b.summaryLine);
  L.push("");

  L.push("AIRCRAFT & ENGINE");
  L.push(`  ${b.aircraft.type} · ${b.aircraft.airline} (${b.aircraft.category})`);
  L.push(`  Engine: ${b.aircraft.engine}`);
  if (b.aircraft.engineNote) L.push(`  Note: ${b.aircraft.engineNote}`);
  L.push("");

  const isJet = b.aircraft.propulsion === "jet";
  L.push("TAKEOFF");
  L.push(`  Thrust: ${b.takeoff.thrustMode}`);
  L.push(
    `  ${isJet ? `Flex temp: ${b.takeoff.flexTempC}°C · ` : ""}Power: ${b.takeoff.powerSetting}`,
  );
  L.push(`  Flaps: ${b.takeoff.flapsConfig}`);
  L.push(`  V1 ${b.takeoff.v1} · VR ${b.takeoff.vr} · V2 ${b.takeoff.v2}`);
  if (b.takeoff.notes) L.push(`  ${b.takeoff.notes}`);
  L.push("");

  L.push("CLIMB");
  L.push(`  Rotate: ${b.climb.rotatePitch} · Initial: ${b.climb.initialClimbSpeed}`);
  L.push(`  Thrust reduction: ${b.climb.thrustReductionAltAGL} ft AGL`);
  L.push(`  Climb power: ${b.climb.climbPower}`);
  L.push(`  Flap retract: ${b.climb.flapRetractSchedule}`);
  L.push(`  Speed: ${b.climb.speedSchedule}`);
  L.push(`  VS: ${b.climb.expectedVS}`);
  L.push("");

  L.push("CRUISE");
  L.push(`  ${b.cruise.recommendedFL} · ${b.cruise.cruiseSpeed}`);
  L.push(`  Power: ${b.cruise.cruisePower} · Fuel flow: ${b.cruise.fuelFlowTotal}`);
  if (b.cruise.stepClimb.recommended) {
    L.push(`  Step climb: ${b.cruise.stepClimb.schedule}`);
  } else if (b.cruise.stepClimb.schedule) {
    L.push(`  Step climb: not required — ${b.cruise.stepClimb.schedule}`);
  }
  if (b.cruise.note) L.push(`  ${b.cruise.note}`);
  L.push("");

  L.push("DESCENT");
  L.push(`  TOD: ${b.descent.todDistanceNm}`);
  L.push(`  Speed: ${b.descent.descentSpeed}`);
  L.push(`  Target VS: ${b.descent.targetVS}`);
  L.push("");

  L.push("APPROACH & LANDING");
  const al = b.approachLanding;
  L.push(`  VLS ${al.vls} · VREF ${al.vref} · VAPP ${al.vapp}`);
  L.push(`  Landing weight: ${al.landingWeightEst}`);
  L.push(`  Flaps: ${al.flapSchedule}`);
  if (al.approachSpeedLimits) L.push(`  Limits: ${al.approachSpeedLimits}`);
  L.push(`  Autobrake: ${al.autobrake}`);
  if (al.ilsInfo) L.push(`  ILS: ${al.ilsInfo}`);
  if (al.runwayExit) L.push(`  Exit: ${al.runwayExit}`);
  L.push("");

  L.push("GO-AROUND");
  L.push(`  ${b.goAround}`);
  L.push("");

  L.push(b.disclaimer);
  return L.join("\n");
}
