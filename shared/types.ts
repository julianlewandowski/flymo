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
