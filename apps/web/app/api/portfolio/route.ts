import { NextRequest } from "next/server";
import { CreatePortfolioItemSchema } from "@repo/shared";
import { portfolioService } from "@/services/portfolio.service";
import { ok, handleError } from "@/lib/api-response";

export async function GET() {
  try {
    const items = await portfolioService.list();
    return ok(items);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = CreatePortfolioItemSchema.parse(await req.json());
    const item = await portfolioService.create(data);
    return ok(item, 201);
  } catch (e) {
    return handleError(e);
  }
}
