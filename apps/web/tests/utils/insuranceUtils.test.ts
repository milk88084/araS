import { describe, it, expect } from "vitest";
import {
  getNetAssetValue,
  getCostBasis,
  getAccumulatedGrowth,
} from "@repo/shared/utils/insuranceUtils";

const BASE_POLICY = {
  surrenderValue: 16000,
  accumulatedBonus: 500,
  accumulatedSumIncrease: 300,
  premiumTotal: 14000,
  sumInsured: 15000,
};

describe("getNetAssetValue", () => {
  it("returns primary USD value as surrenderValue + accumulatedBonus", () => {
    const { usd } = getNetAssetValue(BASE_POLICY);
    expect(usd).toBe(16500);
  });

  it("converts to TWD using provided rate", () => {
    const { twd } = getNetAssetValue(BASE_POLICY, 31.5);
    expect(twd).toBeCloseTo(16500 * 31.5, 0);
  });

  it("uses fallback rate 31.5 when no rate provided", () => {
    const { twd } = getNetAssetValue(BASE_POLICY);
    expect(twd).toBeCloseTo(16500 * 31.5, 0);
  });
});

describe("getCostBasis", () => {
  it("returns premiumTotal as cost basis", () => {
    const { costBasis } = getCostBasis(BASE_POLICY);
    expect(costBasis).toBe(14000);
  });

  it("calculates unrealized gain as surrenderValue - premiumTotal", () => {
    const { unrealizedGain } = getCostBasis(BASE_POLICY);
    expect(unrealizedGain).toBe(2000);
  });

  it("calculates return percentage", () => {
    const { returnPct } = getCostBasis(BASE_POLICY);
    expect(returnPct).toBeCloseTo((2000 / 14000) * 100, 4);
  });

  it("returns null cost basis when premiumTotal is null", () => {
    const { costBasis, unrealizedGain, returnPct } = getCostBasis({
      ...BASE_POLICY,
      premiumTotal: null,
    });
    expect(costBasis).toBeNull();
    expect(unrealizedGain).toBeNull();
    expect(returnPct).toBeNull();
  });
});

describe("getAccumulatedGrowth", () => {
  it("returns accumulatedSumIncrease as additionalDeathBenefit", () => {
    const { additionalDeathBenefit } = getAccumulatedGrowth(BASE_POLICY);
    expect(additionalDeathBenefit).toBe(300);
  });

  it("returns accumulatedBonus as interestAccumulation", () => {
    const { interestAccumulation } = getAccumulatedGrowth(BASE_POLICY);
    expect(interestAccumulation).toBe(500);
  });
});
