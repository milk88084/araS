import { NextRequest } from "next/server";
import { CreateEntrySchema } from "@repo/shared";
import { entriesService } from "@/services/entries.service";
import { ok, handleError } from "@/lib/api-response";

export async function GET() {
  try {
    const entries = await entriesService.list();
    return ok(entries);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = CreateEntrySchema.parse(await req.json());
    const entry = await entriesService.create(data);
    return ok(entry, 201);
  } catch (e) {
    return handleError(e);
  }
}
