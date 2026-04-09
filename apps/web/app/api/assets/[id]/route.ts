import { NextRequest } from "next/server";
import { UpdateAssetSchema } from "@repo/shared";
import { assetsService } from "@/services/assets.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await assetsService.findById(id);
    if (!existing) return err("NOT_FOUND", "Asset not found", 404);
    const data = UpdateAssetSchema.parse(await req.json());
    const asset = await assetsService.update(id, data);
    return ok(asset);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await assetsService.findById(id);
    if (!existing) return err("NOT_FOUND", "Asset not found", 404);
    await assetsService.delete(id);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
