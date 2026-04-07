import { NextResponse } from "next/server";

// CoinGecko /coins/markets — top 500 coins by market cap, no auth required
const COINGECKO_MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=";

let cachedAt = 0;
let cachedResult: { code: string; name: string; id: string }[] | null = null;
const CACHE_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    if (cachedResult && Date.now() - cachedAt < CACHE_MS) {
      return NextResponse.json(cachedResult);
    }

    const [page1, page2] = await Promise.all([
      fetch(COINGECKO_MARKETS_URL + "1", { cache: "no-store" }),
      fetch(COINGECKO_MARKETS_URL + "2", { cache: "no-store" }),
    ]);

    if (!page1.ok || !page2.ok) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
    }

    const raw: { id: string; symbol: string; name: string }[] = [
      ...(await page1.json()),
      ...(await page2.json()),
    ];

    const result = raw
      .map((item) => ({
        code: item.symbol?.toUpperCase() ?? "",
        name: item.name ?? "",
        id: item.id ?? "",
      }))
      .filter((s) => s.code && s.name)
      .sort((a, b) => a.code.localeCompare(b.code));

    cachedAt = Date.now();
    cachedResult = result;

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  }
}
