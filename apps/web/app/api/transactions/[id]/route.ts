import { NextRequest } from "next/server";
import { transactionsService } from "@/services/transactions.service";
import { ok, handleError } from "@/lib/api-response";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await transactionsService.delete(id);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
