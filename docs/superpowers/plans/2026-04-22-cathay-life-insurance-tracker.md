# Cathay Life Insurance Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/insurance` "coming soon" page with a live tracker for the Cathay Life USD Interest-Sensitive Whole Life policy, supporting manual updates to surrender value, accumulated bonus, and sum increase.

**Architecture:** Extend the existing `Insurance` Prisma model with new fields (`sumInsured`, `surrenderValue`, `accumulatedBonus`, `accumulatedSumIncrease`, `lastUpdatedAt`, `isPeriodicPayout`, `policyNumber`, `insurer`). Add a PATCH `/api/insurance/[id]/values` route for manual value updates, new utility functions in `@repo/shared`, and three new UI components wired into the `/insurance` page.

**Tech Stack:** Next.js 15 App Router, Prisma 6 (web-side), Zod (`@repo/shared`), Vitest, React 19, Tailwind CSS 4, `useExchangeRate` hook.

---

## File Map

| File                                                | Action | Purpose                                                           |
| --------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `apps/web/prisma/schema.prisma`                     | Modify | Add 8 new fields to `Insurance` model                             |
| `packages/shared/src/schemas/finance.ts`            | Modify | Extend `InsuranceSchema`; add `UpdateInsurancePolicyValuesSchema` |
| `packages/shared/src/utils/insuranceUtils.ts`       | Modify | Add `getNetAssetValue`, `getCostBasis`, `getAccumulatedGrowth`    |
| `packages/shared/src/index.ts`                      | Modify | Export new utility functions                                      |
| `apps/web/tests/utils/insuranceUtils.test.ts`       | Create | Tests for new utility functions                                   |
| `apps/web/services/insurance.service.ts`            | Modify | Add `findAll()`, `updateValues()`                                 |
| `apps/web/app/api/insurance/route.ts`               | Modify | Add GET handler to list all policies                              |
| `apps/web/app/api/insurance/[id]/values/route.ts`   | Create | PATCH endpoint for updating policy values                         |
| `apps/web/prisma/seed.ts`                           | Create | Seed Cathay Life policy                                           |
| `apps/web/components/finance/PolicySummaryCard.tsx` | Create | Hero card: value, cost basis, gain/loss                           |
| `apps/web/components/finance/PolicyUpdateForm.tsx`  | Create | Manual update form (surrenderValue, bonus, sumIncrease)           |
| `apps/web/components/finance/PolicyDetailSheet.tsx` | Create | Full breakdown table slide-in sheet                               |
| `apps/web/app/(finance)/insurance/page.tsx`         | Modify | Replace placeholder with live policy view                         |

---

### Task 1: Extend Prisma Schema

**Files:**

- Modify: `apps/web/prisma/schema.prisma`

- [ ] **Step 1: Add new fields to the Insurance model**

Replace the existing `Insurance` model in `apps/web/prisma/schema.prisma`:

```prisma
model Insurance {
  id                     String    @id @default(cuid())
  entryId                String    @unique
  entry                  Entry     @relation(fields: [entryId], references: [id], onDelete: Cascade)
  currency               String    @default("USD")
  declaredRate           Float     @default(0)
  premiumTotal           Float?
  currentAge             Int       @default(0)
  startDate              DateTime
  cashValueData          Json      @default("[]")
  // New fields for interest-sensitive whole-life policies
  policyNumber           String?
  insurer                String?
  sumInsured             Float     @default(0)
  surrenderValue         Float     @default(0)
  accumulatedBonus       Float     @default(0)
  accumulatedSumIncrease Float     @default(0)
  lastUpdatedAt          DateTime?
  isPeriodicPayout       Boolean   @default(true)
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
}
```

- [ ] **Step 2: Generate and run migration**

```bash
cd apps/web
npx prisma migrate dev --name add_insurance_policy_fields
```

Expected: Migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Verify migration applied**

```bash
npx prisma studio
```

Open `Insurance` table — confirm new columns exist. Then close Studio.

- [ ] **Step 4: Commit**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/
git commit -m "feat(db): extend insurance model with policy tracking fields"
```

---

### Task 2: Extend Shared Types

**Files:**

- Modify: `packages/shared/src/schemas/finance.ts`

- [ ] **Step 1: Update `InsuranceSchema` to include new fields**

In `packages/shared/src/schemas/finance.ts`, replace the existing `InsuranceSchema` and related schemas:

```ts
// Replace existing InsuranceSchema
export const InsuranceSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  currency: z.string(),
  declaredRate: z.number(),
  premiumTotal: z.number().nullable(),
  currentAge: z.number().int(),
  startDate: z.string(),
  cashValueData: z.array(CashValueRowSchema),
  policyNumber: z.string().nullable().optional(),
  insurer: z.string().nullable().optional(),
  sumInsured: z.number(),
  surrenderValue: z.number(),
  accumulatedBonus: z.number(),
  accumulatedSumIncrease: z.number(),
  lastUpdatedAt: z.string().nullable().optional(),
  isPeriodicPayout: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Insurance = z.infer<typeof InsuranceSchema>;
```

- [ ] **Step 2: Add `UpdateInsurancePolicyValuesSchema`**

After the existing `UpdateInsuranceRateSchema`, add:

```ts
export const UpdateInsurancePolicyValuesSchema = z.object({
  surrenderValue: z.number().nonnegative(),
  accumulatedBonus: z.number().nonnegative(),
  accumulatedSumIncrease: z.number().nonnegative(),
  premiumTotal: z.number().positive().optional(),
});
export type UpdateInsurancePolicyValues = z.infer<typeof UpdateInsurancePolicyValuesSchema>;
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schemas/finance.ts
git commit -m "feat(shared): extend InsuranceSchema with policy tracking fields"
```

---

### Task 3: Utility Functions (TDD)

**Files:**

- Create: `apps/web/tests/utils/insuranceUtils.test.ts`
- Modify: `packages/shared/src/utils/insuranceUtils.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/utils/insuranceUtils.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- apps/web/tests/utils/insuranceUtils.test.ts
```

Expected: FAIL — `getNetAssetValue is not a function` (or similar import error).

- [ ] **Step 3: Implement utility functions**

Append to `packages/shared/src/utils/insuranceUtils.ts`:

```ts
interface PolicyValues {
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
```

- [ ] **Step 4: Export from `packages/shared/src/index.ts`**

Replace the existing insurance export block:

```ts
export {
  getLiveValue,
  projectFutureGrowth,
  calculateIRR,
  getNetAssetValue,
  getCostBasis,
  getAccumulatedGrowth,
  type ProjectionRow,
} from "./utils/insuranceUtils";
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- apps/web/tests/utils/insuranceUtils.test.ts
```

Expected: PASS — all 8 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/utils/insuranceUtils.ts packages/shared/src/index.ts apps/web/tests/utils/insuranceUtils.test.ts
git commit -m "feat(shared): add getNetAssetValue, getCostBasis, getAccumulatedGrowth utilities"
```

---

### Task 4: Service and API Routes

**Files:**

- Modify: `apps/web/services/insurance.service.ts`
- Modify: `apps/web/app/api/insurance/route.ts`
- Create: `apps/web/app/api/insurance/[id]/values/route.ts`

- [ ] **Step 1: Add `findAll` and `updateValues` to the service**

Replace the full content of `apps/web/services/insurance.service.ts`:

```ts
import { prisma } from "@/lib/prisma";
import type {
  CreateInsurance,
  UpdateInsuranceRate,
  UpdateInsurancePolicyValues,
} from "@repo/shared";

export class InsuranceService {
  async create(data: CreateInsurance) {
    const { name, declaredRate, premiumTotal, currentAge, startDate, cashValueData, currency } =
      data;

    return prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          name,
          topCategory: "固定資產",
          subCategory: "保險",
          value: premiumTotal ?? 0,
        },
      });

      await tx.entryHistory.create({
        data: {
          entryId: entry.id,
          delta: premiumTotal ?? 0,
          balance: premiumTotal ?? 0,
        },
      });

      const insurance = await tx.insurance.create({
        data: {
          entryId: entry.id,
          currency: currency ?? "USD",
          declaredRate,
          premiumTotal,
          currentAge,
          startDate: new Date(startDate),
          cashValueData,
        },
      });

      return { ...entry, insurance };
    });
  }

  async findAll() {
    return prisma.insurance.findMany({
      include: { entry: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.insurance.findUnique({
      where: { id },
      include: { entry: true },
    });
  }

  async findByEntryId(entryId: string) {
    return prisma.insurance.findUnique({
      where: { entryId },
      include: { entry: true },
    });
  }

  async updateRate(id: string, data: UpdateInsuranceRate) {
    return prisma.insurance.update({
      where: { id },
      data: {
        declaredRate: data.declaredRate,
        ...(data.cashValueData !== undefined && { cashValueData: data.cashValueData }),
      },
    });
  }

  async updateValues(id: string, data: UpdateInsurancePolicyValues) {
    return prisma.insurance.update({
      where: { id },
      data: {
        surrenderValue: data.surrenderValue,
        accumulatedBonus: data.accumulatedBonus,
        accumulatedSumIncrease: data.accumulatedSumIncrease,
        ...(data.premiumTotal !== undefined && { premiumTotal: data.premiumTotal }),
        lastUpdatedAt: new Date(),
      },
    });
  }

  async deleteByEntryId(entryId: string) {
    return prisma.entry.delete({ where: { id: entryId } });
  }
}

export const insuranceService = new InsuranceService();
```

- [ ] **Step 2: Add GET handler to `apps/web/app/api/insurance/route.ts`**

Replace the full file:

```ts
import { NextRequest } from "next/server";
import { CreateInsuranceSchema } from "@repo/shared";
import { insuranceService } from "@/services/insurance.service";
import { ok, handleError } from "@/lib/api-response";

export async function GET() {
  try {
    const policies = await insuranceService.findAll();
    return ok(policies);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = CreateInsuranceSchema.parse(await req.json());
    const result = await insuranceService.create(data);
    return ok(result, 201);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 3: Create PATCH values route**

Create `apps/web/app/api/insurance/[id]/values/route.ts`:

```ts
import { NextRequest } from "next/server";
import { UpdateInsurancePolicyValuesSchema } from "@repo/shared";
import { insuranceService } from "@/services/insurance.service";
import { ok, err, handleError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await insuranceService.findById(id);
    if (!existing) return err("NOT_FOUND", "Insurance not found", 404);
    const data = UpdateInsurancePolicyValuesSchema.parse(await req.json());
    const result = await insuranceService.updateValues(id, data);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/services/insurance.service.ts apps/web/app/api/insurance/route.ts apps/web/app/api/insurance/[id]/values/route.ts
git commit -m "feat(api): add GET /insurance list, PATCH /insurance/:id/values route"
```

---

### Task 5: Seed Data

**Files:**

- Create: `apps/web/prisma/seed.ts`

- [ ] **Step 1: Create seed file**

Create `apps/web/prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.insurance.findFirst({
    where: { policyNumber: "9199739473" },
  });

  if (existing) {
    console.log("Cathay Life policy already seeded — skipping.");
    return;
  }

  const entry = await prisma.entry.create({
    data: {
      name: "國泰人壽禄美鑫利率變動型美元終身壽險（定期給付型）",
      topCategory: "固定資產",
      subCategory: "保險",
      value: 15000,
    },
  });

  await prisma.entryHistory.create({
    data: {
      entryId: entry.id,
      delta: 15000,
      balance: 15000,
    },
  });

  await prisma.insurance.create({
    data: {
      entryId: entry.id,
      policyNumber: "9199739473",
      insurer: "Cathay Life Insurance",
      currency: "USD",
      declaredRate: 0,
      premiumTotal: null,
      currentAge: 0,
      startDate: new Date("2020-06-30"),
      cashValueData: [],
      sumInsured: 15000,
      surrenderValue: 0,
      accumulatedBonus: 0,
      accumulatedSumIncrease: 0,
      isPeriodicPayout: true,
    },
  });

  console.log("Seeded Cathay Life policy.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add seed script to `apps/web/package.json`**

In `apps/web/package.json`, add to the `"scripts"` section:

```json
"db:seed": "tsx prisma/seed.ts"
```

- [ ] **Step 3: Run seed**

```bash
cd apps/web && pnpm db:seed
```

Expected: `Seeded Cathay Life policy.`

- [ ] **Step 4: Commit**

```bash
git add apps/web/prisma/seed.ts apps/web/package.json
git commit -m "feat(db): add seed script for Cathay Life policy"
```

---

### Task 6: PolicySummaryCard Component

**Files:**

- Create: `apps/web/components/finance/PolicySummaryCard.tsx`

- [ ] **Step 1: Create component**

Create `apps/web/components/finance/PolicySummaryCard.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import type { Insurance } from "@repo/shared";
import { getNetAssetValue, getCostBasis } from "@repo/shared";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface Props {
  insurance: Insurance;
  onUpdate: () => void;
  onViewDetail: () => void;
}

function formatUSD(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTWD(v: number) {
  return `NT$${Math.round(v).toLocaleString("zh-TW")}`;
}

export function PolicySummaryCard({ insurance, onUpdate, onViewDetail }: Props) {
  const { rate, isManual, isLoading } = useExchangeRate();

  const policyYear = useMemo(
    () =>
      Math.floor(
        (Date.now() - new Date(insurance.startDate).getTime()) / (365.25 * 24 * 3600 * 1000)
      ) + 1,
    [insurance.startDate]
  );

  const { usd: navUsd, twd: navTwd } = useMemo(
    () => getNetAssetValue(insurance, rate),
    [insurance, rate]
  );

  const { costBasis, unrealizedGain, returnPct } = useMemo(
    () => getCostBasis(insurance),
    [insurance]
  );

  const gainPositive = (unrealizedGain ?? 0) >= 0;

  return (
    <div className="rounded-2xl bg-white px-4 py-5 shadow-sm">
      {/* Header */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#1c1c1e]">
            {insurance.entry?.name ?? "保單"}
          </p>
          <p className="mt-0.5 text-[11px] text-[#8e8e93]">
            {insurance.insurer ?? "Cathay Life"} · #{insurance.policyNumber ?? "—"} · 第{" "}
            {policyYear} 年
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {(isManual || isLoading) && (
            <span className="rounded-full bg-[#fff3cd] px-2 py-0.5 text-[10px] text-[#856404]">
              {isLoading ? "載入中" : "手動匯率"}
            </span>
          )}
        </div>
      </div>

      {/* Net Asset Value */}
      <div className="mt-3">
        <p className="text-[11px] text-[#8e8e93]">解約金 + 增值回饋</p>
        <p className="mt-0.5 text-[28px] font-bold text-[#1c1c1e]">{formatUSD(navUsd)}</p>
        <p className="text-[12px] text-[#8e8e93]">≈ {formatTWD(navTwd)}</p>
        <p className="mt-0.5 text-[10px] text-[#c7c7cc]">
          匯率 {rate.toFixed(2)} {isManual ? "(手動)" : "(即時)"}
        </p>
      </div>

      {/* Cost basis row */}
      {costBasis !== null && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#f2f2f7] px-3 py-2.5">
          <div>
            <p className="text-[11px] text-[#8e8e93]">保費成本</p>
            <p className="mt-0.5 text-[14px] font-semibold text-[#1c1c1e]">
              {formatUSD(costBasis)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#8e8e93]">未實現損益</p>
            <p
              className="mt-0.5 text-[14px] font-bold"
              style={{ color: gainPositive ? "#34c759" : "#ff3b30" }}
            >
              {gainPositive ? "+" : ""}
              {formatUSD(unrealizedGain!)}
              <span className="ml-1 text-[12px]">
                ({gainPositive ? "+" : ""}
                {returnPct!.toFixed(1)}%)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Secondary metrics */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#f2f2f7] px-3 py-2.5">
          <p className="text-[10px] text-[#8e8e93]">累計增值回饋分享金</p>
          <p className="mt-0.5 text-[13px] font-semibold text-[#1c1c1e]">
            {formatUSD(insurance.accumulatedBonus)}
          </p>
        </div>
        <div className="rounded-xl bg-[#f2f2f7] px-3 py-2.5">
          <p className="text-[10px] text-[#8e8e93]">累計增加保險金額</p>
          <p className="mt-0.5 text-[13px] font-semibold text-[#1c1c1e]">
            {formatUSD(insurance.accumulatedSumIncrease)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onUpdate}
          className="flex-1 rounded-xl bg-[#007aff] py-2.5 text-[14px] font-semibold text-white active:opacity-80"
        >
          更新數值
        </button>
        <button
          onClick={onViewDetail}
          className="flex-1 rounded-xl bg-[#f2f2f7] py-2.5 text-[14px] font-semibold text-[#1c1c1e] active:opacity-80"
        >
          明細
        </button>
      </div>

      {insurance.lastUpdatedAt && (
        <p className="mt-2 text-center text-[10px] text-[#c7c7cc]">
          最後更新：{new Date(insurance.lastUpdatedAt).toLocaleDateString("zh-TW")}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/finance/PolicySummaryCard.tsx
git commit -m "feat(web): add PolicySummaryCard component"
```

---

### Task 7: PolicyUpdateForm Component

**Files:**

- Create: `apps/web/components/finance/PolicyUpdateForm.tsx`

- [ ] **Step 1: Create component**

Create `apps/web/components/finance/PolicyUpdateForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Insurance } from "@repo/shared";

interface Props {
  open: boolean;
  insurance: Insurance;
  onClose: () => void;
  onSaved: () => void;
}

export function PolicyUpdateForm({ open, insurance, onClose, onSaved }: Props) {
  const [surrenderValue, setSurrenderValue] = useState(String(insurance.surrenderValue || ""));
  const [accumulatedBonus, setAccumulatedBonus] = useState(
    String(insurance.accumulatedBonus || "")
  );
  const [accumulatedSumIncrease, setAccumulatedSumIncrease] = useState(
    String(insurance.accumulatedSumIncrease || "")
  );
  const [premiumTotal, setPremiumTotal] = useState(
    insurance.premiumTotal != null ? String(insurance.premiumTotal) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const sv = parseFloat(surrenderValue);
    const ab = parseFloat(accumulatedBonus);
    const asi = parseFloat(accumulatedSumIncrease);
    if (isNaN(sv) || isNaN(ab) || isNaN(asi)) {
      setError("請填寫所有欄位");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, number> = {
        surrenderValue: sv,
        accumulatedBonus: ab,
        accumulatedSumIncrease: asi,
      };
      if (premiumTotal !== "") {
        const pt = parseFloat(premiumTotal);
        if (!isNaN(pt) && pt > 0) body.premiumTotal = pt;
      }
      const res = await fetch(`/api/insurance/${insurance.id}/values`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("更新失敗");
      onSaved();
    } catch {
      setError("儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[90] flex flex-col bg-[#f2f2f7] transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft size={20} className="text-[#1c1c1e]" />
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-[#1c1c1e]">更新保單數值</h1>
            <p className="text-[12px] text-[#8e8e93]">手動輸入最新保單記錄</p>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md space-y-3 px-4 pb-12">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {[
              {
                label: "解約金 (USD)",
                value: surrenderValue,
                onChange: setSurrenderValue,
                placeholder: "0.00",
              },
              {
                label: "累計增值回饋分享金 (USD)",
                value: accumulatedBonus,
                onChange: setAccumulatedBonus,
                placeholder: "0.00",
              },
              {
                label: "累計增加保險金額 (USD)",
                value: accumulatedSumIncrease,
                onChange: setAccumulatedSumIncrease,
                placeholder: "0.00",
              },
              {
                label: "保費總額 (USD) — 選填",
                value: premiumTotal,
                onChange: setPremiumTotal,
                placeholder: "尚未填寫",
              },
            ].map(({ label, value, onChange, placeholder }, i, arr) => (
              <div
                key={label}
                className={`px-5 py-4 ${i < arr.length - 1 ? "border-b border-[#f2f2f7]" : ""}`}
              >
                <p className="mb-1 text-[12px] text-[#8e8e93]">{label}</p>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  step="0.01"
                  min={0}
                  className="w-full bg-transparent text-[20px] font-bold text-[#1c1c1e] outline-none placeholder:text-[#c7c7cc]"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-center text-[13px] text-[#ff3b30]">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-2xl bg-[#007aff] py-4 text-[16px] font-semibold text-white shadow-sm active:opacity-80 disabled:opacity-50"
          >
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/finance/PolicyUpdateForm.tsx
git commit -m "feat(web): add PolicyUpdateForm component"
```

---

### Task 8: PolicyDetailSheet Component

**Files:**

- Create: `apps/web/components/finance/PolicyDetailSheet.tsx`

- [ ] **Step 1: Create component**

Create `apps/web/components/finance/PolicyDetailSheet.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import type { Insurance } from "@repo/shared";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface Props {
  open: boolean;
  insurance: Insurance;
  onClose: () => void;
}

function usd(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function twd(v: number, rate: number) {
  return `NT$${Math.round(v * rate).toLocaleString("zh-TW")}`;
}

export function PolicyDetailSheet({ open, insurance, onClose }: Props) {
  const { rate, isManual } = useExchangeRate();

  const policyYear = useMemo(
    () =>
      Math.floor(
        (Date.now() - new Date(insurance.startDate).getTime()) / (365.25 * 24 * 3600 * 1000)
      ) + 1,
    [insurance.startDate]
  );

  const rows = [
    {
      label: "解約金 (Surrender Value)",
      usdVal: insurance.surrenderValue,
    },
    {
      label: "身故保險金 (Sum Insured)",
      usdVal: insurance.sumInsured,
    },
    {
      label: "累計增值回饋分享金",
      usdVal: insurance.accumulatedBonus,
    },
    {
      label: "累計增加保險金額",
      usdVal: insurance.accumulatedSumIncrease,
    },
  ];

  const startDate = new Date(insurance.startDate);

  return (
    <div
      className={`fixed inset-0 z-[90] flex flex-col bg-[#f2f2f7] transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft size={20} className="text-[#1c1c1e]" />
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-[#1c1c1e]">保單明細</h1>
            <p className="text-[12px] text-[#8e8e93]">
              {insurance.insurer ?? "Cathay Life"} · 第 {policyYear} 年
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md space-y-3 px-4 pb-12">
          {/* Policy info */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "保單號碼",
                value: insurance.policyNumber ?? "—",
              },
              {
                label: "起保日期",
                value: `${startDate.getFullYear()}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${String(startDate.getDate()).padStart(2, "0")}`,
              },
              {
                label: "幣別",
                value: insurance.currency,
              },
              {
                label: "定期給付",
                value: insurance.isPeriodicPayout ? "是" : "否",
              },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                <p className="text-[11px] text-[#8e8e93]">{label}</p>
                <p className="mt-1 text-[14px] font-bold text-[#1c1c1e]">{value}</p>
              </div>
            ))}
          </div>

          {/* Breakdown table */}
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-[#1c1c1e]">項目明細</p>
              {isManual && (
                <span className="rounded-full bg-[#fff3cd] px-2 py-0.5 text-[10px] text-[#856404]">
                  匯率手動
                </span>
              )}
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-[11px] font-medium text-[#8e8e93]">項目</th>
                  <th className="pb-2 text-right text-[11px] font-medium text-[#8e8e93]">USD</th>
                  <th className="pb-2 text-right text-[11px] font-medium text-[#8e8e93]">TWD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f7]">
                {rows.map(({ label, usdVal }) => (
                  <tr key={label}>
                    <td className="py-2.5 pr-2 text-[12px] text-[#1c1c1e]">{label}</td>
                    <td className="py-2.5 text-right text-[12px] font-semibold text-[#1c1c1e]">
                      {usd(usdVal)}
                    </td>
                    <td className="py-2.5 text-right text-[12px] text-[#8e8e93]">
                      {twd(usdVal, rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost basis */}
          {insurance.premiumTotal != null && (
            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <p className="mb-3 text-[15px] font-semibold text-[#1c1c1e]">成本與報酬</p>
              <div className="space-y-2">
                {[
                  { label: "保費總額", usdVal: insurance.premiumTotal },
                  {
                    label: "未實現損益",
                    usdVal: insurance.surrenderValue - insurance.premiumTotal,
                    colored: true,
                  },
                ].map(({ label, usdVal, colored }) => (
                  <div key={label} className="flex items-center justify-between">
                    <p className="text-[13px] text-[#8e8e93]">{label}</p>
                    <p
                      className="text-[13px] font-semibold"
                      style={
                        colored
                          ? { color: usdVal >= 0 ? "#34c759" : "#ff3b30" }
                          : { color: "#1c1c1e" }
                      }
                    >
                      {usdVal >= 0 && colored ? "+" : ""}
                      {usd(usdVal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rate info */}
          <p className="text-center text-[11px] text-[#c7c7cc]">
            匯率：1 USD = {rate.toFixed(2)} TWD {isManual ? "(手動)" : "(即時)"}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/finance/PolicyDetailSheet.tsx
git commit -m "feat(web): add PolicyDetailSheet component"
```

---

### Task 9: Wire Up Insurance Page

**Files:**

- Modify: `apps/web/app/(finance)/insurance/page.tsx`

- [ ] **Step 1: Replace the placeholder with the live page**

Replace the full content of `apps/web/app/(finance)/insurance/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import type { Insurance } from "@repo/shared";
import { PolicySummaryCard } from "@/components/finance/PolicySummaryCard";
import { PolicyUpdateForm } from "@/components/finance/PolicyUpdateForm";
import { PolicyDetailSheet } from "@/components/finance/PolicyDetailSheet";

type PolicyWithEntry = Insurance & { entry: { name: string } | null };

export default function InsurancePage() {
  const [policies, setPolicies] = useState<PolicyWithEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpdate, setSelectedUpdate] = useState<PolicyWithEntry | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PolicyWithEntry | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/insurance");
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      // API returns { success, data } envelope
      const data = json.data ?? json;
      setPolicies(Array.isArray(data) ? data : []);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-[#8e8e93]">載入中...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 text-xl font-bold text-[#1c1c1e]">保險</h1>

      {policies.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#c7c7cc] shadow-sm">
          尚無保單記錄
        </div>
      ) : (
        <div className="space-y-4 pb-10">
          {policies.map((policy) => (
            <PolicySummaryCard
              key={policy.id}
              insurance={policy}
              onUpdate={() => setSelectedUpdate(policy)}
              onViewDetail={() => setSelectedDetail(policy)}
            />
          ))}
        </div>
      )}

      {selectedUpdate && (
        <PolicyUpdateForm
          open={selectedUpdate !== null}
          insurance={selectedUpdate}
          onClose={() => setSelectedUpdate(null)}
          onSaved={() => {
            setSelectedUpdate(null);
            fetchPolicies();
          }}
        />
      )}

      {selectedDetail && (
        <PolicyDetailSheet
          open={selectedDetail !== null}
          insurance={selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify in browser**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/insurance`. Verify:

- Policy card renders with Cathay Life data
- "更新數值" opens the form, saving calls PATCH and refreshes
- "明細" opens the detail sheet with the breakdown table
- Exchange rate label shows "(即時)" or "(手動)" correctly

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass including the new `insuranceUtils.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(finance)/insurance/page.tsx
git commit -m "feat(web): implement Cathay Life insurance tracker page"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement                                                                                                         | Covered by                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Policy seed data                                                                                                         | Task 5                                                                                                                                         |
| `sumInsured`, `surrenderValue`, `accumulatedBonus`, `accumulatedSumIncrease`, `lastUpdatedAt`, `isPeriodicPayout`        | Task 1 + Task 2                                                                                                                                |
| `getNetAssetValue`                                                                                                       | Task 3                                                                                                                                         |
| `getCostBasis`                                                                                                           | Task 3                                                                                                                                         |
| `getAccumulatedGrowth`                                                                                                   | Task 3                                                                                                                                         |
| `PolicySummaryCard` (name, number, start date, policy year, surrender value USD+TWD, gain/loss badge, secondary metrics) | Task 6                                                                                                                                         |
| `PolicyUpdateForm` (surrenderValue, accumulatedBonus, accumulatedSumIncrease, lastUpdatedAt auto-set)                    | Task 7                                                                                                                                         |
| `PolicyDetailSheet` (full breakdown table: 解約金, 身故保險金, 增值回饋, 增加保險金額)                                   | Task 8                                                                                                                                         |
| PATCH `/api/insurance/:id` (used as `/values` sub-route)                                                                 | Task 4                                                                                                                                         |
| `useExchangeRate` with fallback 31.5                                                                                     | Tasks 3, 6, 8 (hook already uses 32.5 but spec says 31.5 — update `FALLBACK_RATE` in `getNetAssetValue` to 31.5; the hook default is separate) |
| Rate source label (live or manual)                                                                                       | Tasks 6, 8                                                                                                                                     |

> **Note:** The existing `useExchangeRate` hook uses `DEFAULT_RATE = 32.5`. The spec says to use 31.5 as the fallback. The utility functions use 31.5 as their own fallback for pure calculations (not affecting the hook). The hook's live-fetch path will use the actual live rate regardless.
