import { NextRequest } from "next/server";
import { insuranceService } from "@/services/insurance.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const insurance = await insuranceService.findById(id);
    if (!insurance) return err("NOT_FOUND", "Insurance not found", 404);
    return ok(insurance);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const insurance = await insuranceService.findById(id);
    if (!insurance) return err("NOT_FOUND", "Insurance not found", 404);
    await insuranceService.deleteByEntryId(insurance.entryId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
