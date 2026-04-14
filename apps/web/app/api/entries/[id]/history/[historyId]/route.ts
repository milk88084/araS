import { NextRequest } from "next/server";
import { UpdateEntryHistorySchema } from "@repo/shared";
import { entriesService } from "@/services/entries.service";
import { ok, handleError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string; historyId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { historyId } = await params;
    const data = UpdateEntryHistorySchema.parse(await req.json());
    const history = await entriesService.updateHistory(historyId, data);
    return ok(history);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { historyId } = await params;
    await entriesService.deleteHistory(historyId);
    return ok(null);
  } catch (e) {
    return handleError(e);
  }
}
