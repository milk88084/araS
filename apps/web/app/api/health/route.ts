import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/lib/api-response";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "healthy", timestamp: new Date().toISOString() });
  } catch (e) {
    return handleError(e);
  }
}
