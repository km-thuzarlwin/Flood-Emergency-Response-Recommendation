/**
 * Case lifecycle transitions (doc 2 "Case lifecycle & resource reservation",
 * doc 5 §12). Each transition is one transaction that locks the case row, checks
 * the transition is legal, moves resource state, and updates the case.
 *
 * Idempotent where the spec implies it (doc 8: "resolved twice ... still
 * transitions to resolved"); illegal transitions are 409 conflict.
 */
import { sql } from "./db";
import { ApiError } from "./http";
import type { FloodCase } from "./schema";

export type LifecycleAction = "dispatch" | "resolve" | "cancel";

export async function transitionCase(
  caseId: string,
  action: LifecycleAction,
): Promise<FloodCase> {
  return sql.begin(async (tx): Promise<FloodCase> => {
    const releaseResources = async (c: FloodCase): Promise<void> => {
      if (c.assigned_unit_id) {
        await tx`
          update rescue_unit set status = 'available'
          where id = ${c.assigned_unit_id} and status in ('reserved', 'deployed')
        `;
      }
      if (c.assigned_shelter_id) {
        await tx`
          update shelter set status = 'accepting'
          where id = ${c.assigned_shelter_id} and status = 'reserved_full'
        `;
      }
    };

    const [c] = await tx<FloodCase[]>`
      select * from flood_case where case_id = ${caseId} for update
    `;
    if (!c) throw new ApiError("not_found", `no flood case ${caseId}`);

    if (action === "dispatch") {
      if (c.status === "dispatched") return c;
      if (c.status !== "assessed") {
        throw new ApiError("conflict", `cannot dispatch a case in status "${c.status}"`);
      }
      if (c.assigned_unit_id) {
        await tx`
          update rescue_unit set status = 'deployed'
          where id = ${c.assigned_unit_id} and status = 'reserved'
        `;
      }
      const [updated] = await tx<FloodCase[]>`
        update flood_case set status = 'dispatched' where case_id = ${caseId} returning *
      `;
      return updated;
    }

    if (action === "resolve") {
      if (c.status === "resolved") return c;
      if (c.status === "cancelled") {
        throw new ApiError("conflict", "cannot resolve a cancelled case");
      }
      await releaseResources(c);
      const [updated] = await tx<FloodCase[]>`
        update flood_case set status = 'resolved' where case_id = ${caseId} returning *
      `;
      return updated;
    }

    // cancel
    if (c.status === "cancelled") return c;
    if (c.status === "resolved") {
      throw new ApiError("conflict", "cannot cancel a resolved case");
    }
    await releaseResources(c);
    const [updated] = await tx<FloodCase[]>`
      update flood_case set status = 'cancelled' where case_id = ${caseId} returning *
    `;
    return updated;
  });
}
