// Types shared between the Express backend and the React frontend.

/** Runway condition affects V-speeds and autobrake selection. */
export type RunwayCondition = "dry" | "wet";

/** Cruise preference: economy (slower, less fuel) or faster. */
export type CruisePreference = "economy" | "fast";

/** Raw form inputs collected from the user and sent to /api/brief. */
export interface BriefRequest {
  departureIcao: string;
  arrivalIcao: string;
  departureRunway: string;
  departureRunwayLengthFt: number;
  departureElevationFt?: number;
  arrivalRunway: string;
  arrivalRunwayLengthFt: number;
  arrivalElevationFt?: number;
  aircraftType: string;
  airline: string;
  weightTonnes: number;
  oatC: number;
  runwayCondition: RunwayCondition;
  windDirectionDeg?: number;
  windSpeedKt?: number;
  cruisePreference?: CruisePreference;
}

/**
 * Flight details pulled from a user's *active* Infinite Flight session via the
 * Live API. Every field is optional: the API only knows what the pilot has set
 * (a filed flight plan, the aircraft/livery they spawned with, ATIS weather),
 * so the frontend pre-fills whatever is present and leaves the rest blank.
 */
export interface IfFlightImport {
  /** First/last flight-plan waypoints, when they look like ICAO codes. */
  departureIcao?: string;
  arrivalIcao?: string;
  /** Active runway parsed from the departure/arrival ATIS, when available. */
  departureRunway?: string;
  arrivalRunway?: string;
  /** Resolved from the flight's aircraftId / liveryId. */
  aircraftType?: string;
  airline?: string;
  /** Parsed from the departure ATIS readback. */
  windDirectionDeg?: number;
  windSpeedKt?: number;
  oatC?: number;
  /** Context shown to the user to confirm we matched the right flight. */
  callsign?: string;
  sessionName?: string;
}

export interface AircraftInfo {
  type: string;
  airline: string;
  engine: string;
  engineNote: string;
}

export interface TakeoffPhase {
  thrustMode: string;
  flexTempC: number;
  n1Percent: string;
  flapsConfig: string;
  v1: number;
  vr: number;
  v2: number;
  notes: string;
}

export interface ClimbPhase {
  rotatePitch: string;
  initialClimbSpeed: string;
  thrustReductionAltAGL: number;
  climbThrustN1: string;
  flapRetractSchedule: string;
  speedSchedule: string;
  expectedVS: string;
}

export interface CruisePhase {
  recommendedFL: string;
  mach: string;
  cruiseN1: string;
  fuelFlowTotal: string;
  note: string;
}

export interface DescentPhase {
  todDistanceNm: string;
  descentSpeed: string;
  targetVS: string;
}

export interface ApproachLandingPhase {
  vls: number;
  vref: number;
  vapp: number;
  landingWeightEst: string;
  flapSchedule: string;
  approachSpeedLimits: string;
  autobrake: string;
  runwayExit: string;
  ilsInfo: string;
}

/** The full briefing returned by Claude, rendered as phase cards. */
export interface Briefing {
  aircraft: AircraftInfo;
  takeoff: TakeoffPhase;
  climb: ClimbPhase;
  cruise: CruisePhase;
  descent: DescentPhase;
  approachLanding: ApproachLandingPhase;
  goAround: string;
  summaryLine: string;
  disclaimer: string;
}

/** Error envelope returned by the backend on failure. */
export interface BriefError {
  error: string;
}
