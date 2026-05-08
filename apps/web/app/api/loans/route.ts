import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CreateLoanSchema } from "@repo/shared";
import { loansService } from "@/services/loans.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return err("UNAUTHORIZED", "Authentication required", 401);
    const data = CreateLoanSchema.parse(await req.json());
    const result = await loansService.create(data, userId);
    return ok(result, 201);
  } catch (e) {
    return handleError(e);
  }
}
