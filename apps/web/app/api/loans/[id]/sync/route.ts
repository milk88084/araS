import { NextRequest } from "next/server";
import { z } from "zod";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

const SyncBodySchema = z.object({
  manualBalance: z.number().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await loansService.findById(id);
    if (!existing) return err("NOT_FOUND", "Loan not found", 404);
    const body = await req.json().catch(() => ({}));
    const { manualBalance } = SyncBodySchema.parse(body);
    const result = await loansService.syncBalance(existing, manualBalance);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
