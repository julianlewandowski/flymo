import type { BriefRequest } from "../shared/types.ts";

/**
 * System prompt for the briefing model. The full airline-performance domain
 * knowledge is baked in here so the returned numbers are realistic.
 */
export const SYSTEM_PROMPT = `You are an airline performance / flight-operations engineer producing a takeoff-to-landing briefing for FLIGHT SIMULATION use only.

Return ONLY a single JSON object (no markdown, no prose, no code fences) matching exactly this shape and key order:

{
  "aircraft": { "type": "", "airline": "", "engine": "", "engineNote": "" },
  "takeoff": { "thrustMode": "", "flexTempC": 0, "n1Percent": "", "flapsConfig": "", "v1": 0, "vr": 0, "v2": 0, "notes": "" },
  "climb": { "rotatePitch": "", "initialClimbSpeed": "", "thrustReductionAltAGL": 1500, "climbThrustN1": "", "flapRetractSchedule": "", "speedSchedule": "", "expectedVS": "" },
  "cruise": { "recommendedFL": "", "mach": "", "cruiseN1": "", "fuelFlowTotal": "", "note": "" },
  "descent": { "todDistanceNm": "", "descentSpeed": "", "targetVS": "" },
  "approachLanding": { "vls": 0, "vref": 0, "vapp": 0, "landingWeightEst": "", "flapSchedule": "", "approachSpeedLimits": "", "autobrake": "", "runwayExit": "", "ilsInfo": "" },
  "goAround": "",
  "summaryLine": "",
  "disclaimer": "Flight sim use only."
}

Numeric fields (flexTempC, v1, vr, v2, thrustReductionAltAGL, vls, vref, vapp) must be plain numbers. All other fields are short strings. Keep every note to 1-2 lines.`;

/** Build the per-flight user message from the validated inputs. */
export function buildUserMessage(input: BriefRequest): string {
  const wind =
    input.windDirectionDeg != null && input.windSpeedKt != null
      ? `${input.windDirectionDeg}° / ${input.windSpeedKt} kt`
      : "not provided";
  const cruise =
    input.cruisePreference === "fast"
      ? "faster (M.82)"
      : input.cruisePreference === "economy"
        ? "economy (M.80)"
        : "not specified";

  return [
    `Departure: ${input.departureIcao} rwy ${input.departureRunway}, ${input.departureRunwayLengthFt} ft${
      input.departureElevationFt != null
        ? `, elev ${input.departureElevationFt} ft`
        : ""
    }`,
    `Arrival: ${input.arrivalIcao} rwy ${input.arrivalRunway}, ${input.arrivalRunwayLengthFt} ft${
      input.arrivalElevationFt != null
        ? `, elev ${input.arrivalElevationFt} ft`
        : ""
    }`,
    `Aircraft: ${input.aircraftType}`,
    `Airline: ${input.airline}`,
    `Weight: ${input.weightTonnes} t`,
    `OAT at departure: ${input.oatC} °C`,
    `Runway condition: ${input.runwayCondition}`,
    `Wind: ${wind}`,
    `Cruise preference: ${cruise}`,
    "",
    "Produce the briefing JSON now.",
  ].join("\n");
}
