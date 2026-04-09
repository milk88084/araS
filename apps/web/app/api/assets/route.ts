import { NextRequest } from "next/server";
import { CreateAssetSchema } from "@repo/shared";
import { assetsService } from "@/services/assets.service";
import { ok, handleError } from "@/lib/api-response";

export async function GET() {
  try {
    const assets = await assetsService.list();
    return ok(assets);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = CreateAssetSchema.parse(await req.json());
    const asset = await assetsService.create(data);
    return ok(asset, 201);
  } catch (e) {
    return handleError(e);
  }
}
