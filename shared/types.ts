// Types shared between the Express backend and the React frontend.

/** Runway condition affects V-speeds and autobrake selection. */
export type RunwayCondition = "dry" | "wet";

/**
 * Propulsion class. Drives how power is expressed (jet N1, turboprop
 * torque/NP, piston throttle/RPM) and what cruise/altitude profile is realistic.
 */
export type Propulsion = "jet" | "turboprop" | "piston";

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

/**
 * The model's chain-of-thought, derived FIRST and treated as the source of
 * truth for every other field. Surfaced in the UI as a collapsible, secondary
 * "Show workings" panel. All fields are short free-text strings, propulsion-
 * aware (FLEX/N1 for jets, torque/throttle for turboprop/piston).
 */
export interface Reasoning {
  /** Aircraft MTOW (max gross weight for GA) in tonnes. */
  mtow: string;
  /** Takeoff weight as a % of MTOW, with the division shown. */
  weightPctMtow: string;
  /** Power margin: jet FLEX headroom, or turboprop/piston derate sense. */
  powerMargin: string;
  /** Takeoff power that follows from the margin (matches takeoff.powerSetting). */
  takeoffPowerDerived: string;
  /** Initial cruise level from the weight band (matches cruise.recommendedFL). */
  initialCruiseLevel: string;
  /** Whether a step climb is worthwhile, and the trigger weights/timing. */
  stepClimbRationale: string;
  /** Sector fuel burn estimate, with the working shown. */
  fuelBurnEstimate: string;
  /** Landing weight = takeoff weight − burn, checked against MLW. */
  landingWeightDerived: string;
  /** Propulsion class and what it means for the power readouts. */
  propulsionNote: string;
}

export interface AircraftInfo {
  type: string;
  airline: string;
  /** e.g. "Widebody jet", "Turboprop", "GA piston". */
  category: string;
  propulsion: Propulsion;
  engine: string;
  engineNote: string;
}

export interface TakeoffPhase {
  thrustMode: string;
  /** Assumed-temperature (FLEX) value — jets only; 0/ignored otherwise. */
  flexTempC: number;
  /** Power readout: jet N1 %, turboprop torque/NP, or piston throttle/RPM. */
  powerSetting: string;
  /** Takeoff trim preset: Airbus THS°, Boeing stab units, or GA elevator trim. */
  trimSetting: string;
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
  /** Climb power readout (propulsion-appropriate). */
  climbPower: string;
  flapRetractSchedule: string;
  speedSchedule: string;
  expectedVS: string;
}

export interface CruisePhase {
  recommendedFL: string;
  /** Cruise speed: jet Mach, or turboprop/piston KIAS/KTAS. */
  cruiseSpeed: string;
  /** Cruise power readout (propulsion-appropriate). */
  cruisePower: string;
  fuelFlowTotal: string;
  /** Step-climb guidance as weight burns off (mainly long-haul jets). */
  stepClimb: StepClimb;
  note: string;
}

/** Whether a step climb is worthwhile for this sector, and the schedule. */
export interface StepClimb {
  recommended: boolean;
  /**
   * When recommended: the step schedule (e.g. "FL360 now → FL380 after ~2h →
   * FL400 late cruise"). When not: a one-line reason (short sector, turboprop).
   */
  schedule: string;
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
  /** Running stabilizer/trim value on stable final (not a preset). */
  trimLanding: string;
  flapSchedule: string;
  approachSpeedLimits: string;
  autobrake: string;
  runwayExit: string;
  ilsInfo: string;
}

/** The full briefing returned by Claude, rendered as phase cards. */
export interface Briefing {
  reasoning: Reasoning;
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
