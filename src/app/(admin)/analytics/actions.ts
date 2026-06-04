"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { refreshAllRiskScores } from "@/server/risk/service";

/** Recompute risk scores immediately (the worker also does this on a schedule). */
export async function recomputeRiskAction(): Promise<void> {
  await requireAdmin();
  await refreshAllRiskScores();
  revalidatePath("/analytics");
}
