import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UpdatePortfolioItemSchema } from "@repo/shared";
import { portfolioService } from "@/services/portfolio.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await portfolioService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Portfolio item not found", 404);
    const data = UpdatePortfolioItemSchema.parse(await req.json());
    const item = await portfolioService.update(id, data, userId);
    return ok(item);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const { id } = await params;
    const existing = await portfolioService.findById(id, userId);
    if (!existing) return err("NOT_FOUND", "Portfolio item not found", 404);
    await portfolioService.delete(id, userId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
