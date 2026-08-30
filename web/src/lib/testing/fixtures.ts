/**
 * Restore the doc-7 acceptance-test fixture: the 5 rescue units + 4 shelters back
 * to their documented state, and clear all flood cases. The acceptance test mutates
 * resource status, so it calls this in `beforeEach`. Also usable as a manual reset.
 *
 * This is the re-runnable reset routine deferred from Phase 1 (see Decision Log).
 * Sent as one statement batch to keep it to a single DB round-trip.
 */
import { sql } from "@/lib/db";

const RESET_SQL = `
  delete from flood_case;

  update rescue_unit set
    status = case id when 'RB-03' then 'deployed'::unit_status else 'available'::unit_status end,
    mobility = case id when 'RB-04' then 'standard'::unit_mobility else 'motorized'::unit_mobility end,
    medical_support = (id in ('RB-01','RB-03','RB-05'));

  update shelter set
    status = case id when 'S-01' then 'full'::shelter_status else 'accepting'::shelter_status end,
    capability = case id when 'S-03' then 'medical_equipped'::shelter_capability else 'general'::shelter_capability end;
`;

export async function resetFixtures(): Promise<void> {
  await sql.unsafe(RESET_SQL);
}
