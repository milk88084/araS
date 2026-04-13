import { NextRequest } from "next/server";
import { UpdateEntrySchema } from "@repo/shared";
import { entriesService } from "@/services/entries.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await entriesService.findById(id);
    if (!existing) return err("NOT_FOUND", "Entry not found", 404);
    const data = UpdateEntrySchema.parse(await req.json());
    const entry = await entriesService.update(id, data);
    return ok(entry);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await entriesService.findById(id);
    if (!existing) return err("NOT_FOUND", "Entry not found", 404);
    await entriesService.delete(id);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
