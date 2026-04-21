type TwseRaw = Record<string, string>;
type TpexRaw = Record<string, string>;
type StockEntry = { 公司代號: string; 公司簡稱: string };

export function mergeExchangeStocks(
  twseItems: TwseRaw[],
  tpexItems: TpexRaw[],
  nameMap: Map<string, string>
): StockEntry[] {
  const map = new Map<string, string>();

  for (const item of twseItems) {
    const code = item["Code"]?.trim() ?? "";
    const name = (nameMap.get(code) ?? item["Name"])?.trim() ?? "";
    if (code && name) map.set(code, name);
  }

  for (const item of tpexItems) {
    const code = item["SecuritiesCompanyCode"]?.trim() ?? "";
    const name = item["CompanyName"]?.trim() ?? "";
    // TWSE entry wins if already present
    if (code && name && !map.has(code)) map.set(code, name);
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ 公司代號: code, 公司簡稱: name }))
    .sort((a, b) => a.公司代號.localeCompare(b.公司代號));
}
