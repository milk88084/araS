import { NextRequest } from "next/server";
import { CreateTransactionSchema } from "@repo/shared";
import { transactionsService } from "@/services/transactions.service";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month") ?? undefined;
    const items = await transactionsService.list(month);
    return ok(items);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = CreateTransactionSchema.parse(await req.json());
    const item = await transactionsService.create(data);
    return ok(item, 201);
  } catch (e) {
    return handleError(e);
  }
}
