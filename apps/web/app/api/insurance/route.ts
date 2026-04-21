import { NextRequest } from "next/server";
import { CreateInsuranceSchema } from "@repo/shared";
import { insuranceService } from "@/services/insurance.service";
import { ok, handleError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const data = CreateInsuranceSchema.parse(await req.json());
    const result = await insuranceService.create(data);
    return ok(result, 201);
  } catch (e) {
    return handleError(e);
  }
}
