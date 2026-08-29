/**
 * Compound capability filtering + shortest-path selection + fallback chain.
 * Handoffs/05-API-and-Backend-Logic.md "Compound Capability Filtering" and
 * "Shortest-Path Routing". This is the system's central design pattern: a
 * candidate must satisfy EVERY required capability, not just one.
 *
 * Exclusion-note wording is matched to the worked example (doc 7 / doc 5 §12.2):
 *   "RB-02, stationed AT Lemyethna, was excluded — no medic aboard"
 *   "Lemyethna Monastery (nearest shelter, distance 0) lacks medical capability for this case"
 * Templates for the non-doc-7 shapes are this project's own (logged in the Decision Log).
 */
import type {
  Capability,
  ShelterCapability,
  UnitMobility,
  UnitStatus,
  ShelterStatus,
} from "@/lib/schema";
import type { DistanceMap } from "./routing";

export interface UnitRow {
  id: string;
  home_township_id: string;
  status: UnitStatus;
  mobility: UnitMobility;
  medical_support: boolean;
}

export interface ShelterRow {
  id: string;
  display_name: string;
  township_id: string;
  status: ShelterStatus;
  capability: ShelterCapability;
}

export interface IncidentContext {
  townshipId: string;
  townshipDisplayName: string;
  distances: DistanceMap;
}

export interface Selection<TId extends string = string> {
  id: TId | null;
  distanceToIncident: number | null;
  notes: string[];
  /** true when the capability requirement had to be relaxed to find a candidate */
  relaxed: boolean;
}

// ---------------------------------------------------------------------------
// capability predicates (doc 5 isCandidate)
// ---------------------------------------------------------------------------

export function unitSatisfies(unit: UnitRow, caps: readonly Capability[]): boolean {
  for (const c of caps) {
    if (c === "motorized" && unit.mobility !== "motorized") return false;
    if (c === "medical_support" && unit.medical_support !== true) return false;
  }
  return true;
}

function firstMissingUnitCapability(
  unit: UnitRow,
  caps: readonly Capability[],
): Capability | null {
  for (const c of caps) {
    if (c === "motorized" && unit.mobility !== "motorized") return "motorized";
    if (c === "medical_support" && unit.medical_support !== true) return "medical_support";
  }
  return null;
}

// ---------------------------------------------------------------------------
// nearest-with-tie-break
// ---------------------------------------------------------------------------

interface Located {
  id: string;
  townshipId: string;
  distance: number;
}

/** doc 5: lowest distance; tie-break prefers co-located, then lower id alphabetically. */
function pickNearest<T extends Located>(candidates: T[], incidentTownshipId: string): T | null {
  let best: T | null = null;
  for (const c of candidates) {
    if (best === null) {
      best = c;
      continue;
    }
    if (c.distance !== best.distance) {
      if (c.distance < best.distance) best = c;
      continue;
    }
    const cCo = c.townshipId === incidentTownshipId;
    const bCo = best.townshipId === incidentTownshipId;
    if (cCo !== bCo) {
      if (cCo) best = c;
      continue;
    }
    if (c.id < best.id) best = c;
  }
  return best;
}

function withDistance<T extends { id: string }>(
  rows: T[],
  townshipOf: (row: T) => string,
  distances: DistanceMap,
): Array<T & Located> {
  const out: Array<T & Located> = [];
  for (const row of rows) {
    const townshipId = townshipOf(row);
    const distance = distances.get(townshipId);
    if (distance === undefined) continue; // unreachable — should not happen in the 25-node network
    out.push({ ...row, id: row.id, townshipId, distance });
  }
  return out;
}

// ---------------------------------------------------------------------------
// unit selection
// ---------------------------------------------------------------------------

const UNIT_RELAX_FLAG =
  "No unit with medical support was available; arrange a medic to meet the case, or coordinate a second unit.";
const UNIT_ESCALATE_FLAG =
  "No suitable rescue unit available in the network — escalate for manual coordination.";

function unitExclusionNote(
  unit: UnitRow & Located,
  incident: IncidentContext,
  missing: Capability,
): string {
  const where =
    unit.distance === 0
      ? `stationed AT ${incident.townshipDisplayName}`
      : `${unit.distance} away`;
  const reason =
    missing === "medical_support" ? "no medic aboard" : "not an engine-powered boat";
  return `${unit.id}, ${where}, was excluded — ${reason}`;
}

export function selectUnit(
  units: UnitRow[],
  requiredCapabilities: readonly Capability[],
  incident: IncidentContext,
): Selection {
  const available = units.filter((u) => u.status === "available");
  const notes: string[] = [];

  let candidates = available.filter((u) => unitSatisfies(u, requiredCapabilities));
  let relaxed = false;

  if (candidates.length === 0 && requiredCapabilities.includes("medical_support")) {
    const relaxedCaps = requiredCapabilities.filter((c) => c !== "medical_support");
    candidates = available.filter((u) => unitSatisfies(u, relaxedCaps));
    if (candidates.length > 0) {
      relaxed = true;
      notes.push(UNIT_RELAX_FLAG);
    }
  }

  const located = withDistance(candidates, (u) => u.home_township_id, incident.distances);
  const chosen = pickNearest(located, incident.townshipId);

  // exclusion notes: available units strictly closer than the chosen one that fail
  // the *full* required-capability set on a specific capability.
  const chosenDistance = chosen?.distance ?? Infinity;
  const availableLocated = withDistance(available, (u) => u.home_township_id, incident.distances);
  for (const u of availableLocated) {
    if (u.distance >= chosenDistance) continue;
    const missing = firstMissingUnitCapability(u, requiredCapabilities);
    if (missing) notes.push(unitExclusionNote(u, incident, missing));
  }

  if (chosen === null) notes.push(UNIT_ESCALATE_FLAG);

  return {
    id: chosen?.id ?? null,
    distanceToIncident: chosen?.distance ?? null,
    notes,
    relaxed,
  };
}

// ---------------------------------------------------------------------------
// shelter selection
// ---------------------------------------------------------------------------

const SHELTER_RELAX_FLAG =
  "No medical-equipped shelter was available; a general shelter was assigned — arrange medical support to meet arrivals.";
const SHELTER_ESCALATE_FLAG =
  "No shelter is accepting anywhere in the network — escalate for manual coordination.";

function shelterExclusionNote(shelter: ShelterRow & Located): string {
  const where = shelter.distance === 0 ? "nearest shelter, distance 0" : `distance ${shelter.distance}`;
  return `${shelter.display_name} (${where}) lacks medical capability for this case`;
}

export function selectShelter(
  shelters: ShelterRow[],
  requiredShelterCapabilities: readonly ShelterCapability[],
  incident: IncidentContext,
): Selection {
  const accepting = shelters.filter((s) => s.status === "accepting");
  const notes: string[] = [];
  const needsMedical = requiredShelterCapabilities.includes("medical_equipped");

  let candidates = needsMedical
    ? accepting.filter((s) => s.capability === "medical_equipped")
    : accepting;
  let relaxed = false;

  if (candidates.length === 0 && needsMedical) {
    candidates = accepting;
    if (candidates.length > 0) {
      relaxed = true;
      notes.push(SHELTER_RELAX_FLAG);
    }
  }

  const located = withDistance(candidates, (s) => s.township_id, incident.distances);
  const chosen = pickNearest(located, incident.townshipId);

  if (needsMedical) {
    const chosenDistance = chosen?.distance ?? Infinity;
    const acceptingLocated = withDistance(accepting, (s) => s.township_id, incident.distances);
    for (const s of acceptingLocated) {
      if (s.distance >= chosenDistance) continue;
      if (s.capability !== "medical_equipped") notes.push(shelterExclusionNote(s));
    }
  }

  if (chosen === null) notes.push(SHELTER_ESCALATE_FLAG);

  return {
    id: chosen?.id ?? null,
    distanceToIncident: chosen?.distance ?? null,
    notes,
    relaxed,
  };
}
