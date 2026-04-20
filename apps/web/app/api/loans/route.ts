import { NextRequest } from "next/server";
import { CreateLoanSchema } from "@repo/shared";
import { loansService } from "@/services/loans.service";
import { ok, handleError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const data = CreateLoanSchema.parse(await req.json());
    const result = await loansService.create(data);
    return ok(result, 201);
  } catch (e) {
    return handleError(e);
  }
}
