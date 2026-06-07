import Anthropic from "@anthropic-ai/sdk";
import type { Request, Response } from "express";
import type {
  BriefRequest,
  Briefing,
  Propulsion,
  RunwayCondition,
} from "../shared/types.ts";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4000;

// Lazily created so the server can boot (and serve /api/health) even if the
// key is missing — we only error when an actual briefing is requested.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in the server environment");
  }
  if (!client) {
    // Bound each attempt so a hung connection can't stall the request forever;
    // the SDK still retries transient failures up to maxRetries.
    client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 2 });
  }
  return client;
}

/** Map an error from the briefing pipeline to an HTTP status + clear message. */
function describeError(err: unknown): { status: number; message: string } {
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return { status: 504, message: "The model request timed out. Please try again." };
  }
  if (err instanceof Anthropic.APIError) {
    if (err.status === 429) {
      return {
        status: 429,
        message: "The model API is rate limited. Please wait a moment and try again.",
      };
    }
    if (err.status != null && err.status >= 500) {
      return {
        status: 503,
        message: "The model is temporarily unavailable. Please try again.",
      };
    }
    return { status: 502, message: "Could not reach the model API. Please try again." };
  }
  // Our own thrown errors (validation, truncation, parse) already carry a clear message.
  return { status: 502, message: (err as Error).message };
}

/** Throws with a human-readable message if the field is missing/blank. */
function reqStr(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`Missing or invalid field: ${key}`);
  }
  return v.trim();
}

/** Optional inclusive bounds for a numeric field. */
interface Range {
  min?: number;
  max?: number;
}

/** Throw if a finite number falls outside the given inclusive range. */
function assertRange(key: string, n: number, range?: Range): void {
  if (range?.min != null && n < range.min) {
    throw new Error(`${key} must be at least ${range.min}`);
  }
  if (range?.max != null && n > range.max) {
    throw new Error(`${key} must be at most ${range.max}`);
  }
}

/** Throws if the field is missing, not a finite number, or out of range. */
function reqNum(
  body: Record<string, unknown>,
  key: string,
  range?: Range,
): number {
  const v = body[key];
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`Missing or invalid number: ${key}`);
  }
  assertRange(key, n, range);
  return n;
}

/** Optional number — returns undefined when absent/blank; range-checked if present. */
function optNum(
  body: Record<string, unknown>,
  key: string,
  range?: Range,
): number | undefined {
  const v = body[key];
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  assertRange(key, n, range);
  return n;
}

/** Validate and normalize the raw request body into a BriefRequest. */
function parseInput(body: Record<string, unknown>): BriefRequest {
  const condition = reqStr(body, "runwayCondition") as RunwayCondition;
  if (condition !== "dry" && condition !== "wet") {
    throw new Error("runwayCondition must be 'dry' or 'wet'");
  }
  const cruisePref = body.cruisePreference;

  return {
    departureIcao: reqStr(body, "departureIcao").toUpperCase(),
    arrivalIcao: reqStr(body, "arrivalIcao").toUpperCase(),
    departureRunway: reqStr(body, "departureRunway").toUpperCase(),
    departureRunwayLengthFt: reqNum(body, "departureRunwayLengthFt", {
      min: 1,
      max: 30000,
    }),
    departureElevationFt: optNum(body, "departureElevationFt", {
      min: -1500,
      max: 30000,
    }),
    arrivalRunway: reqStr(body, "arrivalRunway").toUpperCase(),
    arrivalRunwayLengthFt: reqNum(body, "arrivalRunwayLengthFt", {
      min: 1,
      max: 30000,
    }),
    arrivalElevationFt: optNum(body, "arrivalElevationFt", {
      min: -1500,
      max: 30000,
    }),
    aircraftType: reqStr(body, "aircraftType"),
    airline: reqStr(body, "airline"),
    // 0.1 t covers light GA (in tonnes); 600 t clears the A380's MTOW.
    weightTonnes: reqNum(body, "weightTonnes", { min: 0.1, max: 600 }),
    oatC: reqNum(body, "oatC", { min: -90, max: 60 }),
    runwayCondition: condition,
    windDirectionDeg: optNum(body, "windDirectionDeg", { min: 0, max: 360 }),
    windSpeedKt: optNum(body, "windSpeedKt", { min: 0, max: 250 }),
    cruisePreference:
      cruisePref === "fast" || cruisePref === "economy"
        ? cruisePref
        : undefined,
  };
}

/**
 * Models sometimes wrap JSON in ```json fences despite instructions.
 * Strip any fences and isolate the outermost JSON object before parsing.
 */
function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    // Usually truncated or otherwise malformed output — give a clear,
    // actionable message rather than a raw "Unexpected token" parse error.
    throw new Error(
      "The model returned a malformed briefing. Please try again.",
    );
  }
}

// --- Response normalization -------------------------------------------------
// The frontend reads deeply nested fields (b.reasoning[...], b.cruise.stepClimb
// .recommended, ...) without guards. Models occasionally omit a field or a whole
// section; coerce the parsed JSON into a complete, well-typed Briefing with safe
// defaults so a slightly-off response degrades gracefully instead of crashing.

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function asStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function asNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function asPropulsion(v: unknown): Propulsion {
  return v === "turboprop" || v === "piston" ? v : "jet";
}

/** Coerce arbitrary parsed JSON into a complete Briefing with safe defaults. */
function normalizeBriefing(parsed: unknown): Briefing {
  const b = asObj(parsed);
  const reasoning = asObj(b.reasoning);
  const aircraft = asObj(b.aircraft);
  const takeoff = asObj(b.takeoff);
  const climb = asObj(b.climb);
  const cruise = asObj(b.cruise);
  const stepClimb = asObj(cruise.stepClimb);
  const descent = asObj(b.descent);
  const approach = asObj(b.approachLanding);

  return {
    reasoning: {
      mtow: asStr(reasoning.mtow),
      weightPctMtow: asStr(reasoning.weightPctMtow),
      powerMargin: asStr(reasoning.powerMargin),
      takeoffPowerDerived: asStr(reasoning.takeoffPowerDerived),
      initialCruiseLevel: asStr(reasoning.initialCruiseLevel),
      stepClimbRationale: asStr(reasoning.stepClimbRationale),
      fuelBurnEstimate: asStr(reasoning.fuelBurnEstimate),
      landingWeightDerived: asStr(reasoning.landingWeightDerived),
      propulsionNote: asStr(reasoning.propulsionNote),
    },
    aircraft: {
      type: asStr(aircraft.type),
      airline: asStr(aircraft.airline),
      category: asStr(aircraft.category),
      propulsion: asPropulsion(aircraft.propulsion),
      engine: asStr(aircraft.engine),
      engineNote: asStr(aircraft.engineNote),
    },
    takeoff: {
      thrustMode: asStr(takeoff.thrustMode),
      flexTempC: asNum(takeoff.flexTempC),
      powerSetting: asStr(takeoff.powerSetting),
      trimSetting: asStr(takeoff.trimSetting),
      flapsConfig: asStr(takeoff.flapsConfig),
      v1: asNum(takeoff.v1),
      vr: asNum(takeoff.vr),
      v2: asNum(takeoff.v2),
      notes: asStr(takeoff.notes),
    },
    climb: {
      rotatePitch: asStr(climb.rotatePitch),
      initialClimbSpeed: asStr(climb.initialClimbSpeed),
      thrustReductionAltAGL: asNum(climb.thrustReductionAltAGL),
      climbPower: asStr(climb.climbPower),
      flapRetractSchedule: asStr(climb.flapRetractSchedule),
      speedSchedule: asStr(climb.speedSchedule),
      expectedVS: asStr(climb.expectedVS),
    },
    cruise: {
      recommendedFL: asStr(cruise.recommendedFL),
      cruiseSpeed: asStr(cruise.cruiseSpeed),
      cruisePower: asStr(cruise.cruisePower),
      fuelFlowTotal: asStr(cruise.fuelFlowTotal),
      stepClimb: {
        recommended: stepClimb.recommended === true,
        schedule: asStr(stepClimb.schedule),
      },
      note: asStr(cruise.note),
    },
    descent: {
      todDistanceNm: asStr(descent.todDistanceNm),
      descentSpeed: asStr(descent.descentSpeed),
      targetVS: asStr(descent.targetVS),
    },
    approachLanding: {
      vls: asNum(approach.vls),
      vref: asNum(approach.vref),
      vapp: asNum(approach.vapp),
      landingWeightEst: asStr(approach.landingWeightEst),
      trimLanding: asStr(approach.trimLanding),
      flapSchedule: asStr(approach.flapSchedule),
      approachSpeedLimits: asStr(approach.approachSpeedLimits),
      autobrake: asStr(approach.autobrake),
      runwayExit: asStr(approach.runwayExit),
      ilsInfo: asStr(approach.ilsInfo),
    },
    goAround: asStr(b.goAround),
    summaryLine: asStr(b.summaryLine),
    disclaimer: asStr(b.disclaimer) || "Flight sim use only.",
  };
}

/** POST /api/brief — proxy that turns flight inputs into a Claude briefing. */
export async function handleBrief(req: Request, res: Response): Promise<void> {
  let input: BriefRequest;
  try {
    input = parseInput((req.body ?? {}) as Record<string, unknown>);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  try {
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });

    // A max_tokens stop means the JSON is almost certainly cut off mid-object;
    // fail fast with guidance rather than letting the parse blow up obscurely.
    if (message.stop_reason === "max_tokens") {
      throw new Error(
        "The briefing was too long and got cut off. Please try again.",
      );
    }

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (text.trim() === "") {
      throw new Error("The model returned an empty response. Please try again.");
    }

    const briefing = normalizeBriefing(extractJson(text));
    res.json(briefing);
  } catch (err) {
    console.error("[flymo] briefing failed:", err);
    const { status, message } = describeError(err);
    res.status(status).json({ error: message });
  }
}
