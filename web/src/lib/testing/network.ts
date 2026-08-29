/**
 * The regional network as plain data — transcribed from
 * Handoffs/03-Regional-Network-and-Seed-Data.md §6.3 and the doc 7 fixture.
 * Used by the routing / filtering unit tests so they don't need a database.
 * Kept in sync with supabase/migrations/002 + 003.
 */
import type { Edge } from "@/lib/domain/routing";
import type { UnitRow, ShelterRow } from "@/lib/domain/filtering";

/** 26 undirected edges (doc 3 §6.3). */
export const SEED_EDGES: Edge[] = (
  [
    ["hinthada", "zalun", 3],
    ["zalun", "myanaung", 3],
    ["myanaung", "kyangin", 3],
    ["zalun", "ingapu", 3],
    ["hinthada", "lemyethna", 4],
    ["lemyethna", "ngathaingchaung", 3],
    ["ngathaingchaung", "thabaung", 3],
    ["lemyethna", "yegyi", 3],
    ["yegyi", "kyonpyaw", 2],
    ["kyonpyaw", "kyaunggon", 2],
    ["kyonpyaw", "kangyidaunt", 3],
    ["thabaung", "pathein", 3],
    ["kyonpyaw", "nyaungdon", 3],
    ["nyaungdon", "maubin", 2],
    ["maubin", "pantanaw", 2],
    ["maubin", "danubyu", 3],
    ["pathein", "ngapudaw", 3],
    ["pathein", "mawlamyinegyun", 4],
    ["mawlamyinegyun", "labutta", 3],
    ["mawlamyinegyun", "bogale", 3],
    ["mawlamyinegyun", "myaungmya", 3],
    ["myaungmya", "labutta", 4],
    ["bogale", "pyapon", 3],
    ["pyapon", "dedaye", 2],
    ["pyapon", "kyaiklat", 3],
    ["pantanaw", "dedaye", 4],
  ] as const
).map(([from_township_id, to_township_id, distance]) => ({
  from_township_id,
  to_township_id,
  distance,
  passable: true,
}));

/** doc 7 rescue-unit fixture. */
export const SEED_UNITS: UnitRow[] = [
  { id: "RB-01", home_township_id: "yegyi", status: "available", mobility: "motorized", medical_support: true },
  { id: "RB-02", home_township_id: "lemyethna", status: "available", mobility: "motorized", medical_support: false },
  { id: "RB-03", home_township_id: "pathein", status: "deployed", mobility: "motorized", medical_support: true },
  { id: "RB-04", home_township_id: "myaungmya", status: "available", mobility: "standard", medical_support: false },
  { id: "RB-05", home_township_id: "bogale", status: "available", mobility: "motorized", medical_support: true },
];

/** doc 7 shelter fixture. */
export const SEED_SHELTERS: ShelterRow[] = [
  { id: "S-01", display_name: "Yegyi High School", township_id: "yegyi", status: "full", capability: "general" },
  { id: "S-02", display_name: "Lemyethna Monastery", township_id: "lemyethna", status: "accepting", capability: "general" },
  { id: "S-03", display_name: "Pathein General Hospital Annex", township_id: "pathein", status: "accepting", capability: "medical_equipped" },
  { id: "S-04", display_name: "Myaungmya Community Hall", township_id: "myaungmya", status: "accepting", capability: "general" },
];
