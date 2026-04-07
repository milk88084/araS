import { NextResponse } from "next/server";

// SEC EDGAR company tickers — free, no auth required
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

let cachedAt = 0;
let cachedResult: { code: string; name: string }[] | null = null;
const CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours (list changes rarely)

export async function GET() {
  try {
    if (cachedResult && Date.now() - cachedAt < CACHE_MS) {
      return NextResponse.json(cachedResult);
    }

    const res = await fetch(SEC_TICKERS_URL, {
      cache: "no-store",
      headers: { "User-Agent": "araS-finance-app contact@example.com" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
    }

    const raw: Record<string, { cik_str: number; ticker: string; title: string }> =
      await res.json();

    const result = Object.values(raw)
      .map((item) => ({
        code: item.ticker?.toUpperCase() ?? "",
        name: item.title ?? "",
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
