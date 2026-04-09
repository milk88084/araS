import { NextRequest } from "next/server";
import { quotesService } from "@/services/quotes.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params;
    const quote = await quotesService.fetchQuote(symbol);
    return ok(quote);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("No data found")) {
      return err("SYMBOL_NOT_FOUND", e.message, 404);
    }
    return handleError(e);
  }
}
