import { NextRequest } from "next/server";
import { CreateLiabilitySchema } from "@repo/shared";
import { liabilitiesService } from "@/services/liabilities.service";
import { ok, handleError } from "@/lib/api-response";

export async function GET() {
  try {
    const liabilities = await liabilitiesService.list();
    return ok(liabilities);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = CreateLiabilitySchema.parse(await req.json());
    const liability = await liabilitiesService.create(data);
    return ok(liability, 201);
  } catch (e) {
    return handleError(e);
  }
}
