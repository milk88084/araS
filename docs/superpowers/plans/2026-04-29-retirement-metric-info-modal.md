# Retirement Metric Info Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add click-to-explain modals to 5 metric blocks on RetirementPage, showing a centered overlay with plain-language description and formula steps using live computed values.

**Architecture:** All changes confined to `RetirementPage.tsx`. A new `InfoModal` sub-component handles rendering. A single `openModal: string | null` state tracks which modal is open. Modal content is derived from existing `calcs`, `params`, `netAssets`, and `totalInvestment` values via `useMemo` — no new computation.

**Tech Stack:** React (useState, useMemo), Tailwind CSS 4, Vitest + React Testing Library

---

### Task 1: Write failing tests

**Files:**

- Create: `apps/web/components/finance/__tests__/RetirementPage.info-modal.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { RetirementPage } from "../RetirementPage";

vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../store/useFinanceStore", () => ({
  useFinanceStore: () => ({
    entries: [],
    fetchAll: vi.fn(),
  }),
}));

describe("RetirementPage — Info Modal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens 目標總額 modal when that card is clicked", () => {
    render(<RetirementPage />);
    fireEvent.click(screen.getByTestId("metric-目標總額"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("目標總額").length).toBeGreaterThan(1);
  });

  it("opens 退休缺口 modal when that card is clicked", () => {
    render(<RetirementPage />);
    fireEvent.click(screen.getByTestId("metric-退休缺口"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("退休缺口").length).toBeGreaterThan(1);
  });

  it("opens 財務自由預測 modal when that card is clicked", () => {
    render(<RetirementPage />);
    fireEvent.click(screen.getByTestId("metric-財務自由預測"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("財務自由預測").length).toBeGreaterThan(1);
  });

  it("opens 被動收入覆蓋 modal when that card is clicked", () => {
    render(<RetirementPage />);
    fireEvent.click(screen.getByTestId("metric-被動收入覆蓋"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("被動收入覆蓋").length).toBeGreaterThan(1);
  });

  it("opens 目標達成率 modal when the progress section is clicked", () => {
    render(<RetirementPage />);
    fireEvent.click(screen.getByTestId("goal-progress-section"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("目標達成率").length).toBeGreaterThan(1);
  });

  it("closes modal when 了解了 button is clicked", () => {
    render(<RetirementPage />);
    fireEvent.click(screen.getByTestId("metric-目標總額"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("了解了"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes modal when backdrop is clicked", () => {
    render(<RetirementPage />);
    fireEvent.click(screen.getByTestId("metric-目標總額"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify all 7 fail**

```bash
pnpm --filter @repo/web test -- components/finance/__tests__/RetirementPage.info-modal.test.tsx
```

Expected: 7 failures — `getByTestId("metric-目標總額")` not found, etc.

---

### Task 2: Add ModalContent interface and InfoModal sub-component

**Files:**

- Modify: `apps/web/components/finance/RetirementPage.tsx`

- [ ] **Step 1: Add `ModalContent` interface after the `Params` interface (after line 36)**

Insert this block immediately after the closing `}` of the `Params` interface:

```tsx
interface ModalContent {
  title: string;
  description: string;
  steps: { label: string; value: string }[];
  result: { label: string; value: string };
}
```

- [ ] **Step 2: Add `InfoModal` sub-component after the `SectionCard` component (after line 162)**

Insert this block immediately after the closing `}` of `SectionCard`:

```tsx
function InfoModal({ content, onClose }: { content: ModalContent; onClose: () => void }) {
  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-[11px] text-[#8e8e93]">計算說明</p>
            <p className="text-[16px] font-bold text-[#1c1c1e]">{content.title}</p>
          </div>
          <button
            aria-label="關閉"
            onClick={onClose}
            className="text-[20px] leading-none text-[#8e8e93]"
          >
            ×
          </button>
        </div>
        <p className="mb-3 text-[12px] leading-relaxed text-[#3c3c43]">{content.description}</p>
        <div className="rounded-xl bg-[#f2f2f7] px-3 py-3 text-[11px]">
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-[#8e8e93] uppercase">
            公式
          </p>
          {content.steps.map((step, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="text-[#8e8e93]">{step.label}</span>
              {step.value && (
                <span className="ml-2 text-right font-medium text-[#1c1c1e]">{step.value}</span>
              )}
            </div>
          ))}
          <div className="my-2 border-t border-[#e5e5ea]" />
          <div className="flex justify-between">
            <span className="font-semibold text-[#1c1c1e]">{content.result.label}</span>
            <span className="ml-2 text-right font-bold text-[#1c1c1e]">{content.result.value}</span>
          </div>
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="rounded-xl bg-[#007aff] px-6 py-2 text-[13px] font-medium text-white"
          >
            了解了
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 3: Update MetricCard with onClick prop and add openModal state

**Files:**

- Modify: `apps/web/components/finance/RetirementPage.tsx`

- [ ] **Step 1: Update `MetricCard` to accept an optional `onClick` prop**

Replace the entire `MetricCard` function (lines 128–153) with:

```tsx
function MetricCard({
  label,
  value,
  sub,
  color = "#1c1c1e",
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-2xl bg-white px-4 py-3 shadow-sm${onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
      onClick={onClick}
      data-testid={onClick ? `metric-${label}` : undefined}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon size={13} className="text-[#8e8e93]" />
        <span className="text-[12px] text-[#8e8e93]">{label}</span>
      </div>
      <p className="text-[17px] font-bold" style={{ color }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-[#8e8e93]">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Add `openModal` state inside `RetirementPage` (after the `showParams` state, around line 172)**

```tsx
const [openModal, setOpenModal] = useState<string | null>(null);
```

---

### Task 4: Add modalContents config, wire up all 5 blocks, render modal

**Files:**

- Modify: `apps/web/components/finance/RetirementPage.tsx`

- [ ] **Step 1: Add `modalContents` useMemo after the `sensCalc` useMemo (after line 353)**

```tsx
const modalContents = useMemo<Record<string, ModalContent>>(
  () => ({
    target: {
      title: "目標總額",
      description:
        "依 SWR 法則，退休後每年需自行提領的金額除以安全提領率，反推退休時所需累積的總資產。",
      steps: [
        {
          label: "退休後月支出（通膨調整）",
          value: `NT$ ${fmtWan(Math.round(calcs.fme))} ／月`,
        },
        { label: "扣除政府退休金", value: `NT$ ${fmtWan(params.govPension)} ／月` },
        { label: "年提領額 × 12", value: `NT$ ${fmtWan(Math.round(calcs.aw))} ／年` },
        { label: `÷ SWR (${params.swr}%)`, value: "" },
      ],
      result: { label: "目標總額", value: `NT$ ${fmtWan(Math.round(calcs.tt))}` },
    },
    gap: {
      title: "退休缺口",
      description: "退休目標總額與現有淨資產之間的差距，即目前尚需繼續累積的金額。",
      steps: [
        { label: "退休目標總額", value: `NT$ ${fmtWan(Math.round(calcs.tt))}` },
        { label: "− 現有淨資產", value: `NT$ ${fmtWan(netAssets)}` },
      ],
      result: {
        label: "退休缺口",
        value: calcs.gap === 0 ? "已達標 ✓" : `NT$ ${fmtWan(Math.round(calcs.gap))}`,
      },
    },
    fi: {
      title: "財務自由預測",
      description:
        "從現在起，每年將資產以積累期報酬率複利成長，並持續加入每月投入，模擬何時首次達到退休目標總額。",
      steps: [
        { label: "起始淨資產", value: `NT$ ${fmtWan(netAssets)}` },
        {
          label: "每月定期投入 × 12",
          value: `NT$ ${fmtWan(params.monthlyContrib * 12)} ／年`,
        },
        { label: "積累期年化報酬", value: `${params.accRate}%` },
        { label: "目標總額", value: `NT$ ${fmtWan(Math.round(calcs.tt))}` },
      ],
      result: {
        label: "財務自由年齡",
        value: calcs.fiAge ? `${calcs.fiAge} 歲（${calcs.fiYear} 年）` : "100 歲以上",
      },
    },
    passive: {
      title: "被動收入覆蓋",
      description:
        "以現有投資資產假設 4% 年化股息率，計算每月能產生多少被動收入，並衡量可覆蓋退休後月支出的比例。",
      steps: [
        { label: "投資資產", value: `NT$ ${fmtWan(totalInvestment)}` },
        { label: "× 4% 股息假設 ÷ 12", value: "" },
        {
          label: "月被動收入",
          value: `NT$ ${fmtWan(Math.round(calcs.monthlyPassive))}`,
        },
        {
          label: "退休後月支出（通膨後）",
          value: `NT$ ${fmtWan(Math.round(calcs.fme))}`,
        },
      ],
      result: {
        label: "被動收入覆蓋率",
        value: `${calcs.passiveCoverage.toFixed(1)}%`,
      },
    },
    goal: {
      title: "目標達成率",
      description: "現有淨資產佔退休目標總額的百分比，反映目前距離退休目標的累積進度。",
      steps: [
        { label: "現有淨資產", value: `NT$ ${fmtWan(netAssets)}` },
        { label: "退休目標總額", value: `NT$ ${fmtWan(Math.round(calcs.tt))}` },
      ],
      result: {
        label: "目標達成率",
        value: `${calcs.goalPct.toFixed(1)}%`,
      },
    },
  }),
  [calcs, params, netAssets, totalInvestment]
);
```

- [ ] **Step 2: Add `onClick` props to the 4 MetricCard instances (around lines 372–401)**

Replace the four MetricCard JSX elements in the `{/* Summary metric cards 2×2 */}` section:

```tsx
<MetricCard
  label="目標總額"
  value={`${fmtWan(calcs.tt)} 元`}
  sub={`${params.swr}% SWR 法則`}
  icon={Target}
  onClick={() => setOpenModal("target")}
/>
<MetricCard
  label="退休缺口"
  value={calcs.gap === 0 ? "已達標" : `${fmtWan(calcs.gap)} 元`}
  sub={calcs.gap === 0 ? "恭喜達成！" : "尚需累積"}
  color={calcs.gap === 0 ? "#34c759" : "#ff3b30"}
  icon={AlertTriangle}
  onClick={() => setOpenModal("gap")}
/>
<MetricCard
  label="財務自由預測"
  value={calcs.fiYear ? `${calcs.fiYear} 年` : "100歲以上"}
  sub={
    calcs.fiAge ? `${calcs.fiAge}歲 · 距今${calcs.fiAge - params.currentAge}年` : "尚未達標"
  }
  color={fiColor}
  icon={Calendar}
  onClick={() => setOpenModal("fi")}
/>
<MetricCard
  label="被動收入覆蓋"
  value={`${calcs.passiveCoverage.toFixed(1)}%`}
  sub={`月 ${fmtWan(calcs.monthlyPassive)} 元`}
  color={coverageColor}
  icon={TrendingUp}
  onClick={() => setOpenModal("passive")}
/>
```

- [ ] **Step 3: Add `data-testid` and `onClick` to the goal progress section outer div (around line 404)**

Replace:

```tsx
<div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
  <div className="mb-2 flex items-center justify-between">
    <p className="text-[15px] font-semibold text-[#1c1c1e]">目標達成率</p>
```

With:

```tsx
<div
  data-testid="goal-progress-section"
  className="cursor-pointer rounded-2xl bg-white px-4 py-4 shadow-sm transition-shadow hover:shadow-md"
  onClick={() => setOpenModal("goal")}
>
  <div className="mb-2 flex items-center justify-between">
    <p className="text-[15px] font-semibold text-[#1c1c1e]">目標達成率</p>
```

- [ ] **Step 4: Render `InfoModal` at the end of the return JSX (just before the root closing `</div>`, around line 922)**

Replace the root closing tag:

```tsx
    </div>
  );
}
```

With:

```tsx
      {openModal && modalContents[openModal] && (
        <InfoModal
          content={modalContents[openModal]}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  );
}
```

---

### Task 5: Run tests, type-check, and commit

**Files:**

- No changes

- [ ] **Step 1: Run the info modal tests**

```bash
pnpm --filter @repo/web test -- components/finance/__tests__/RetirementPage.info-modal.test.tsx
```

Expected: 7 tests pass.

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/finance/RetirementPage.tsx apps/web/components/finance/__tests__/RetirementPage.info-modal.test.tsx
git commit -m "feat(web): add info modal to retirement metric cards"
```
