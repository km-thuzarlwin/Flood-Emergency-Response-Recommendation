/**
 * Restore the doc-7 acceptance-test fixture: the 5 rescue units + 4 shelters back
 * to their documented state, and clear all flood cases. The acceptance test mutates
 * resource status, so it calls this in `beforeEach`. Also usable as a manual reset.
 *
 * This is the re-runnable reset routine deferred from Phase 1 (see Decision Log).
 */
import { sql } from "@/lib/db";
import { SEED_UNITS, SEED_SHELTERS } from "./network";

export async function resetFixtures(): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`delete from flood_case`;
    for (const u of SEED_UNITS) {
      await tx`
        update rescue_unit set
          status = ${u.status},
          mobility = ${u.mobility},
          medical_support = ${u.medical_support},
          home_township_id = ${u.home_township_id}
        where id = ${u.id}
      `;
    }
    for (const s of SEED_SHELTERS) {
      await tx`
        update shelter set
          status = ${s.status},
          capability = ${s.capability},
          township_id = ${s.township_id}
        where id = ${s.id}
      `;
    }
  });
}
