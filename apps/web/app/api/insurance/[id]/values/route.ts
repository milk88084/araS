import { NextRequest } from "next/server";
import { UpdateInsurancePolicyValuesSchema } from "@repo/shared";
import { insuranceService } from "@/services/insurance.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await insuranceService.findById(id);
    if (!existing) return err("NOT_FOUND", "Insurance not found", 404);
    const data = UpdateInsurancePolicyValuesSchema.parse(await req.json());
    const result = await insuranceService.updateValues(id, data);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
