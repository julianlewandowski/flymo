import type { Propulsion } from "./types.ts";

/** A flyable civilian aircraft in the Infinite Flight catalog. */
export interface CatalogAircraft {
  /** Display name as used in Infinite Flight (also the value sent to the API). */
  name: string;
  propulsion: Propulsion;
  category:
    | "Widebody jet"
    | "Narrowbody jet"
    | "Regional jet"
    | "Business jet"
    | "Turboprop"
    | "GA piston";
}

/**
 * Civilian aircraft from the Infinite Flight fleet (infiniteflight.com/fleet).
 * Military types (F/A-18E, A-10, the C-130 variants) are intentionally
 * excluded — flymo only models civilian performance.
 */
export const IF_AIRCRAFT: CatalogAircraft[] = [
  // Widebody jets
  { name: "Airbus A330-300", propulsion: "jet", category: "Widebody jet" },
  { name: "Airbus A330-900neo", propulsion: "jet", category: "Widebody jet" },
  { name: "Airbus A350-900", propulsion: "jet", category: "Widebody jet" },
  { name: "Airbus A380-800", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 747-200", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 747-400", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 747-8", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 777-200ER", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 777-200LR", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 777-300ER", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 777F", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 787-8 Dreamliner", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 787-9 Dreamliner", propulsion: "jet", category: "Widebody jet" },
  { name: "Boeing 787-10 Dreamliner", propulsion: "jet", category: "Widebody jet" },
  { name: "McDonnell Douglas DC-10", propulsion: "jet", category: "Widebody jet" },
  { name: "McDonnell Douglas DC-10F", propulsion: "jet", category: "Widebody jet" },
  { name: "McDonnell Douglas MD-11", propulsion: "jet", category: "Widebody jet" },
  { name: "McDonnell Douglas MD-11F", propulsion: "jet", category: "Widebody jet" },

  // Narrowbody jets
  { name: "Airbus A220-300", propulsion: "jet", category: "Narrowbody jet" },
  { name: "Airbus A318-100", propulsion: "jet", category: "Narrowbody jet" },
  { name: "Airbus A319-100", propulsion: "jet", category: "Narrowbody jet" },
  { name: "Airbus A320-200", propulsion: "jet", category: "Narrowbody jet" },
  { name: "Airbus A321-200", propulsion: "jet", category: "Narrowbody jet" },
  { name: "Boeing 737-700", propulsion: "jet", category: "Narrowbody jet" },
  { name: "Boeing 737-800", propulsion: "jet", category: "Narrowbody jet" },
  { name: "Boeing 737-8 MAX", propulsion: "jet", category: "Narrowbody jet" },
  { name: "Boeing 737-900", propulsion: "jet", category: "Narrowbody jet" },
  { name: "Boeing 757-200", propulsion: "jet", category: "Narrowbody jet" },

  // Regional jets
  { name: "Bombardier CRJ-200", propulsion: "jet", category: "Regional jet" },
  { name: "Bombardier CRJ-700", propulsion: "jet", category: "Regional jet" },
  { name: "Bombardier CRJ-900", propulsion: "jet", category: "Regional jet" },
  { name: "Bombardier CRJ-1000", propulsion: "jet", category: "Regional jet" },
  { name: "Embraer E175", propulsion: "jet", category: "Regional jet" },
  { name: "Embraer E190", propulsion: "jet", category: "Regional jet" },

  // Business jet
  { name: "Bombardier Challenger 350", propulsion: "jet", category: "Business jet" },

  // Turboprops
  { name: "Bombardier Dash 8 Q400", propulsion: "turboprop", category: "Turboprop" },
  { name: "Cessna 208 Caravan", propulsion: "turboprop", category: "Turboprop" },
  { name: "Daher TBM-930", propulsion: "turboprop", category: "Turboprop" },

  // General aviation pistons
  { name: "Cessna 172", propulsion: "piston", category: "GA piston" },
  { name: "CubCrafters XCub", propulsion: "piston", category: "GA piston" },
];

/** Best-effort propulsion lookup for a free-text aircraft string. */
export function propulsionFor(typeText: string): Propulsion | undefined {
  const t = typeText.trim().toLowerCase();
  const match = IF_AIRCRAFT.find(
    (a) => a.name.toLowerCase() === t || t.includes(a.name.toLowerCase()),
  );
  return match?.propulsion;
}
