import { NextRequest } from "next/server";
import { UpdateLiabilitySchema } from "@repo/shared";
import { liabilitiesService } from "@/services/liabilities.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await liabilitiesService.findById(id);
    if (!existing) return err("NOT_FOUND", "Liability not found", 404);
    const data = UpdateLiabilitySchema.parse(await req.json());
    const liability = await liabilitiesService.update(id, data);
    return ok(liability);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await liabilitiesService.findById(id);
    if (!existing) return err("NOT_FOUND", "Liability not found", 404);
    await liabilitiesService.delete(id);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
