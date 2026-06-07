import Anthropic from "@anthropic-ai/sdk";
import type { Request, Response } from "express";
import type { BriefRequest, RunwayCondition } from "../shared/types.ts";
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
  if (!client) client = new Anthropic({ apiKey });
  return client;
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
  return JSON.parse(text.slice(start, end + 1));
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

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const briefing = extractJson(text);
    res.json(briefing);
  } catch (err) {
    console.error("[flymo] briefing failed:", err);
    res.status(502).json({ error: (err as Error).message });
  }
}
