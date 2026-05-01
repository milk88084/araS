export type CashValueRow = {
  policyYear: number;
  cashValue: number;
};

export type ProjectionRow = {
  age: number;
  year: number;
  projectedValue: number;
};

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

export function getLiveValue(
  cashValueData: CashValueRow[],
  startDate: Date | string,
  currentDate: Date
): number {
  if (cashValueData.length === 0) return 0;

  const sorted = [...cashValueData].sort((a, b) => a.policyYear - b.policyYear);

  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const currentPolicyYear = Math.floor((currentDate.getTime() - start.getTime()) / MS_PER_YEAR) + 1;

  const row = sorted.find((r) => r.policyYear === currentPolicyYear);
  if (row !== undefined) return row.cashValue;

  // Year exceeds table — return last row's cashValue
  return sorted[sorted.length - 1]!.cashValue;
}

export function projectFutureGrowth(
  currentValue: number,
  declaredRate: number,
  currentAge: number,
  targetMaxAge = 90
): ProjectionRow[] {
  const r = declaredRate / 100;
  const currentYear = new Date().getFullYear();
  const rows: ProjectionRow[] = [];

  for (let t = 0; t <= targetMaxAge - currentAge; t++) {
    const age = currentAge + t;
    const year = currentYear + t;
    const projectedValue = currentValue * Math.pow(1 + r, t);
    rows.push({ age, year, projectedValue });
  }

  return rows;
}

export function calculateIRR(
  premiumTotal: number,
  currentValue: number,
  yearsElapsed: number
): number {
  if (yearsElapsed <= 0 || premiumTotal <= 0) return 0;

  const irr = Math.pow(currentValue / premiumTotal, 1 / yearsElapsed) - 1;
  return Math.round(irr * 10000) / 100;
}

export interface PolicyValues {
  surrenderValue: number;
  accumulatedBonus: number;
  accumulatedSumIncrease: number;
  premiumTotal: number | null;
  sumInsured: number;
}

const FALLBACK_RATE = 31.5;

export function getNetAssetValue(
  policy: PolicyValues,
  exchangeRate = FALLBACK_RATE
): { usd: number; twd: number } {
  const usd = policy.surrenderValue + policy.accumulatedBonus;
  return { usd, twd: usd * exchangeRate };
}

export function getCostBasis(policy: PolicyValues): {
  costBasis: number | null;
  unrealizedGain: number | null;
  returnPct: number | null;
} {
  if (policy.premiumTotal === null) {
    return { costBasis: null, unrealizedGain: null, returnPct: null };
  }
  const unrealizedGain = policy.surrenderValue - policy.premiumTotal;
  const returnPct = (unrealizedGain / policy.premiumTotal) * 100;
  return { costBasis: policy.premiumTotal, unrealizedGain, returnPct };
}

export function getAccumulatedGrowth(policy: PolicyValues): {
  additionalDeathBenefit: number;
  interestAccumulation: number;
} {
  return {
    additionalDeathBenefit: policy.accumulatedSumIncrease,
    interestAccumulation: policy.accumulatedBonus,
  };
}

export type MilestoneRow = {
  years: number;
  label: string;
  age: number;
  value: number;
  gainRatio: number;
};

export function getMilestoneProjections(
  surrenderValue: number,
  declaredRate: number,
  currentAge: number
): MilestoneRow[] {
  const r = declaredRate / 100;
  return [0, 10, 20, 30].map((years) => ({
    years,
    label: years === 0 ? "現在" : `${years}年後`,
    age: currentAge + years,
    value: surrenderValue * Math.pow(1 + r, years),
    gainRatio: Math.pow(1 + r, years),
  }));
}
