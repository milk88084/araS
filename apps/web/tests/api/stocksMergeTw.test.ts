import { describe, it, expect } from "vitest";
import { mergeExchangeStocks } from "../../app/api/stocks/tw/mergeExchangeStocks";

describe("mergeExchangeStocks", () => {
  it("maps TWSE fields Code/Name to canonical shape", () => {
    const twse = [{ Code: "2330", Name: "台積電" }];
    const result = mergeExchangeStocks(twse, [], new Map());
    expect(result).toContainEqual({ 公司代號: "2330", 公司簡稱: "台積電" });
  });

  it("prefers t187ap03_L name over TWSE Name for TWSE entries", () => {
    const twse = [{ Code: "2330", Name: "TSMC" }];
    const nameMap = new Map([["2330", "台積電"]]);
    const result = mergeExchangeStocks(twse, [], nameMap);
    expect(result).toContainEqual({ 公司代號: "2330", 公司簡稱: "台積電" });
  });

  it("maps TPEx fields SecuritiesCompanyCode/CompanyName to canonical shape", () => {
    const tpex = [{ SecuritiesCompanyCode: "00933B", CompanyName: "國泰10Y+金融債" }];
    const result = mergeExchangeStocks([], tpex, new Map());
    expect(result).toContainEqual({ 公司代號: "00933B", 公司簡稱: "國泰10Y+金融債" });
  });

  it("deduplicates by code — TWSE entry wins over TPEx when both present", () => {
    const twse = [{ Code: "006201", Name: "元大富櫃50" }];
    const tpex = [{ SecuritiesCompanyCode: "006201", CompanyName: "元大富櫃50(TPEx)" }];
    const result = mergeExchangeStocks(twse, tpex, new Map());
    const matches = result.filter((s) => s.公司代號 === "006201");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.公司簡稱).toBe("元大富櫃50");
  });

  it("returns results sorted ascending by code", () => {
    const twse = [
      { Code: "2330", Name: "A" },
      { Code: "1101", Name: "B" },
    ];
    const result = mergeExchangeStocks(twse, [], new Map());
    expect(result[0]?.公司代號).toBe("1101");
    expect(result[1]?.公司代號).toBe("2330");
  });

  it("filters out entries with empty code or name", () => {
    const twse = [
      { Code: "", Name: "nobody" },
      { Code: "2330", Name: "" },
    ];
    const result = mergeExchangeStocks(twse, [], new Map());
    expect(result).toHaveLength(0);
  });
});
