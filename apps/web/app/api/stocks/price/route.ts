import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Yahoo Finance — supports TW (0050.TW), TWO (6488.TWO), and US (AAPL)
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "fetch failed" }, { status: 502 });
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) {
      return NextResponse.json({ error: "no data" }, { status: 404 });
    }

    return NextResponse.json({
      symbol,
      price: meta.regularMarketPrice as number,
      currency: meta.currency as string,
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
