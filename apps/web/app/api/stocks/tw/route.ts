import { NextResponse } from "next/server";

// STOCK_DAY_ALL returns ALL listed securities: stocks, equity ETFs, bond ETFs (Code + Name)
const TWSE_ALL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
// t187ap03_L has better Chinese short names for regular companies
const TWSE_COMPANIES = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L";

// Simple in-memory cache (survives within the same server process, resets on restart)
let cachedAt = 0;
let cachedResult: { 公司代號: string; 公司簡稱: string }[] | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

async function fetchJSON(url: string): Promise<Record<string, string>[]> {
  try {
    // cache: "no-store" so Next.js Data Cache doesn't serve stale data
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // Return in-memory cache if still fresh
    if (cachedResult && Date.now() - cachedAt < CACHE_MS) {
      return NextResponse.json(cachedResult);
    }

    const [allSecurities, companies] = await Promise.all([
      fetchJSON(TWSE_ALL),
      fetchJSON(TWSE_COMPANIES),
    ]);

    // Build code → Chinese short name map from companies endpoint
    const nameMap = new Map<string, string>();
    for (const item of companies) {
      const code = item["公司代號"]?.trim();
      const name = (item["公司簡稱"] ?? item["公司名稱"])?.trim();
      if (code && name) nameMap.set(code, name);
    }

    // STOCK_DAY_ALL covers everything: stocks, equity ETFs, bond ETFs (00710B, 00933B…)
    const result = allSecurities
      .map((item) => {
        const code = item["Code"]?.trim() ?? "";
        // Prefer the better Chinese name from companies map; fall back to STOCK_DAY_ALL Name
        const name = (nameMap.get(code) ?? item["Name"])?.trim() ?? "";
        return { 公司代號: code, 公司簡稱: name };
      })
      .filter((s) => s.公司代號 && s.公司簡稱)
      .sort((a, b) => a.公司代號.localeCompare(b.公司代號));

    cachedAt = Date.now();
    cachedResult = result;

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  }
}
