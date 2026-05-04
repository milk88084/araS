import { NextRequest } from "next/server";
import { UpdateLoanSchema } from "@repo/shared";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const loan = await loansService.findById(id);
    if (!loan) return err("NOT_FOUND", "Loan not found", 404);
    return ok(loan);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await loansService.findById(id);
    if (!existing) return err("NOT_FOUND", "Loan not found", 404);
    const data = UpdateLoanSchema.parse(await req.json());
    const loan = await loansService.update(existing.id, data);
    return ok(loan);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const loan = await loansService.findById(id);
    if (!loan) return err("NOT_FOUND", "Loan not found", 404);
    await loansService.deleteByEntryId(loan.entryId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
