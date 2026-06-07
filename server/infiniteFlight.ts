import type { Request, Response } from "express";
import type { IfFlightImport } from "../shared/types.ts";

// Infinite Flight Live API — cloud REST surface for *live* multiplayer flights.
// Docs: https://infiniteflight.com/guide/developer-reference/live-api
// Request a key by emailing hello@infiniteflight.com.
const BASE_URL = "https://api.infiniteflight.com/public/v2";

// An import fans out to several Live API calls; bound each so a slow IF server
// can't hang the whole request. 8s is generous for these small JSON responses.
const REQUEST_TIMEOUT_MS = 8000;

/** Every Live API response is wrapped in this envelope; errorCode 0 == OK. */
interface Envelope<T> {
  errorCode: number;
  result: T;
}

interface IfSession {
  id: string;
  name: string;
  maxUsers: number;
  userCount: number;
  type: number;
}

interface IfFlight {
  flightId: string;
  userId: string;
  username: string | null;
  callsign: string | null;
  aircraftId: string;
  liveryId: string;
}

interface IfFlightPlan {
  flightId: string;
  waypoints: string[] | null;
}

interface IfAircraft {
  id: string;
  name: string;
}

interface IfLivery {
  id: string;
  aircraftID: string;
  aircraftName: string;
  liveryName: string;
}

/** A flight matched to the session it was found in. */
interface MatchedFlight {
  sessionId: string;
  sessionName: string;
  flight: IfFlight;
}

/** Thrown for expected, user-facing failures (mapped to specific HTTP codes). */
class IfError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function getApiKey(): string {
  const key = process.env.INFINITE_FLIGHT_API_KEY;
  if (!key) {
    throw new IfError(
      "Infinite Flight import is not configured (INFINITE_FLIGHT_API_KEY is unset).",
      503,
    );
  }
  return key;
}

/** GET a Live API path and unwrap the envelope, surfacing API-level errors. */
async function ifGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((err: Error) => {
    if (err.name === "TimeoutError") {
      throw new IfError(
        "Infinite Flight took too long to respond. Please try again.",
        504,
      );
    }
    throw new IfError(`Could not reach Infinite Flight: ${err.message}`, 502);
  });

  if (res.status === 401 || res.status === 403) {
    throw new IfError("Infinite Flight rejected the API key.", 502);
  }
  if (!res.ok) {
    throw new IfError(`Infinite Flight API error (${res.status}).`, 502);
  }

  const body = (await res.json()) as Envelope<T>;
  if (body.errorCode !== 0) {
    throw new IfError(
      `Infinite Flight API returned errorCode ${body.errorCode}.`,
      502,
    );
  }
  return body.result;
}

// Aircraft and livery catalogs are large and effectively static, so cache them
// for the life of the process to avoid refetching on every import.
let aircraftCache: Map<string, string> | null = null;
let liveryCache: Map<string, string> | null = null;

async function aircraftName(aircraftId: string): Promise<string | undefined> {
  if (!aircraftCache) {
    const list = await ifGet<IfAircraft[]>("/aircraft");
    aircraftCache = new Map(list.map((a) => [a.id, a.name]));
  }
  return aircraftCache.get(aircraftId);
}

async function liveryName(liveryId: string): Promise<string | undefined> {
  if (!liveryCache) {
    const list = await ifGet<IfLivery[]>("/aircraft/liveries");
    liveryCache = new Map(list.map((l) => [l.id, l.liveryName]));
  }
  return liveryCache.get(liveryId);
}

/**
 * Find a user's active flight by their IFC username across all live sessions.
 * Returns the first match (a user can only be flying in one place at a time).
 */
async function findActiveFlight(username: string): Promise<MatchedFlight> {
  const target = username.trim().toLowerCase();
  const sessions = await ifGet<IfSession[]>("/sessions");

  for (const session of sessions) {
    const flights = await ifGet<IfFlight[]>(
      `/sessions/${session.id}/flights`,
    );
    const flight = flights.find(
      (f) => f.username?.trim().toLowerCase() === target,
    );
    if (flight) {
      return { sessionId: session.id, sessionName: session.name, flight };
    }
  }

  throw new IfError(
    `No active flight found for "${username}". Spawn in on a live server and file a flight plan, then try again.`,
    404,
  );
}

const ICAO_RE = /^[A-Z]{4}$/;

/** Pick departure/arrival ICAOs from the first/last ICAO-shaped waypoints. */
function endpointIcaos(waypoints: string[] | null): {
  departureIcao?: string;
  arrivalIcao?: string;
} {
  if (!waypoints?.length) return {};
  const icaos = waypoints
    .map((w) => w.trim().toUpperCase())
    .filter((w) => ICAO_RE.test(w));
  if (!icaos.length) return {};
  return { departureIcao: icaos[0], arrivalIcao: icaos[icaos.length - 1] };
}

/**
 * Best-effort parse of an IF ATIS readback. The text is free-form, so we
 * extract only the high-confidence fields and leave anything ambiguous unset.
 */
function parseAtis(atis: string | null): {
  windDirectionDeg?: number;
  windSpeedKt?: number;
  oatC?: number;
  runway?: string;
} {
  if (!atis) return {};
  const out: ReturnType<typeof parseAtis> = {};

  const wind = atis.match(/wind\s+(\d{3})\s+at\s+(\d+)/i);
  if (wind) {
    out.windDirectionDeg = Number(wind[1]);
    out.windSpeedKt = Number(wind[2]);
  }

  const temp = atis.match(/temperature\s+(-?\d+)/i);
  if (temp) out.oatC = Number(temp[1]);

  // "...landing and departing runway 28L..." — grab the first runway named.
  const rwy = atis.match(/runway[s]?\s+(\d{1,2}[LRC]?)/i);
  if (rwy) out.runway = rwy[1].toUpperCase();

  return out;
}

/** Build the prefill payload from a matched flight, enriching where possible. */
async function buildImport(match: MatchedFlight): Promise<IfFlightImport> {
  const { sessionId, sessionName, flight } = match;

  // Fetch the independent pieces concurrently; tolerate per-piece failures so
  // a missing flight plan or ATIS still yields a partial prefill.
  const [plan, aircraftType, airline] = await Promise.all([
    ifGet<IfFlightPlan>(
      `/sessions/${sessionId}/flights/${flight.flightId}/flightplan`,
    ).catch(() => null),
    aircraftName(flight.aircraftId).catch(() => undefined),
    liveryName(flight.liveryId).catch(() => undefined),
  ]);

  const { departureIcao, arrivalIcao } = endpointIcaos(plan?.waypoints ?? null);

  // ATIS is keyed by airport, so only fetch it once we know the endpoints.
  const [depAtis, arrAtis] = await Promise.all([
    departureIcao
      ? ifGet<string | null>(
          `/sessions/${sessionId}/airport/${departureIcao}/atis`,
        ).catch(() => null)
      : Promise.resolve(null),
    arrivalIcao
      ? ifGet<string | null>(
          `/sessions/${sessionId}/airport/${arrivalIcao}/atis`,
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  const dep = parseAtis(depAtis);
  const arr = parseAtis(arrAtis);

  return {
    departureIcao,
    arrivalIcao,
    departureRunway: dep.runway,
    arrivalRunway: arr.runway,
    aircraftType,
    airline,
    windDirectionDeg: dep.windDirectionDeg,
    windSpeedKt: dep.windSpeedKt,
    oatC: dep.oatC,
    callsign: flight.callsign ?? undefined,
    sessionName,
  };
}

/** GET /api/if/import?username=... — prefill a briefing from a live IF flight. */
export async function handleIfImport(
  req: Request,
  res: Response,
): Promise<void> {
  const username =
    typeof req.query.username === "string" ? req.query.username.trim() : "";
  if (!username) {
    res.status(400).json({ error: "Missing required query param: username" });
    return;
  }

  try {
    const match = await findActiveFlight(username);
    const imported = await buildImport(match);
    res.json(imported);
  } catch (err) {
    if (err instanceof IfError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error("[flymo] IF import failed:", err);
    res.status(502).json({ error: (err as Error).message });
  }
}
