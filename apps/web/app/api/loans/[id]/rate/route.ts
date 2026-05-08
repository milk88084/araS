import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UpdateLoanRateSchema } from "@repo/shared";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await loansService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Loan not found", 404);
    const data = UpdateLoanRateSchema.parse(await req.json());
    const loan = await loansService.updateRate(id, data);
    return ok(loan);
  } catch (e) {
    return handleError(e);
  }
}
