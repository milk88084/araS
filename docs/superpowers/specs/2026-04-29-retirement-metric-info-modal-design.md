# Retirement Page — Metric Info Modal Design

**Date:** 2026-04-29
**File:** `apps/web/components/finance/RetirementPage.tsx`

## Overview

Add click-to-explain functionality to five metric blocks on the RetirementPage. Clicking any block opens a centered modal overlay that explains the block's calculation logic in plain language and shows the formula with the user's actual computed values.

## Affected Blocks

1. 目標總額 (MetricCard)
2. 退休缺口 (MetricCard)
3. 財務自由預測 (MetricCard)
4. 被動收入覆蓋 (MetricCard)
5. 目標達成率 (goal progress bar section)

## Interaction Design

- User clicks a block → centered modal appears with dimmed background overlay
- User closes modal by clicking the "了解了" button or clicking the backdrop
- Only one modal open at a time
- Blocks gain `cursor-pointer` and `hover:shadow-md` to signal interactivity

## State

Add a single state variable to `RetirementPage`:

```ts
const [openModal, setOpenModal] = useState<string | null>(null);
```

Keys: `"target"` | `"gap"` | `"fi"` | `"passive"` | `"goal"`

## InfoModal Component

New sub-component inside `RetirementPage.tsx` (no new file):

```tsx
interface ModalContent {
  title: string;
  description: string;
  steps: { label: string; value: string }[];
  result: { label: string; value: string };
}

function InfoModal({
  content,
  onClose,
}: {
  content: ModalContent;
  onClose: () => void;
}) { ... }
```

### Layout

```
┌─────────────────────────────┐
│ 計算說明          [title]  × │
│─────────────────────────────│
│ [description text]          │
│                             │
│ ┌─ 公式 ──────────────────┐ │
│ │ step label     value    │ │
│ │ step label     value    │ │
│ │ ──────────────────────  │ │
│ │ result label   value    │ │
│ └─────────────────────────┘ │
│                             │
│         [ 了解了 ]          │
└─────────────────────────────┘
```

- White card, `rounded-2xl`, `max-w-[320px]`, `w-[calc(100%-32px)]`
- Formula block: `bg-[#f2f2f7] rounded-xl`, each step on its own line
- Result row: `font-bold`, separated by a divider
- Backdrop: `fixed inset-0 bg-black/40 z-50`, click closes modal
- Card: `z-[51]`, centered via flexbox

## Modal Content (per block)

All values come from the already-computed `calcs`, `params`, and `netAssets` — no new computation needed.

### 目標總額 (`"target"`)

**Description:** 依 SWR 法則，退休後每年需自行提領的金額除以安全提領率，反推退休時需累積的總資產。

**Steps:**
| Label | Value |
|---|---|
| 退休後月支出（通膨調整） | `fmtWan(calcs.fme)` 元／月 |
| 扣除政府退休金 | `fmtWan(params.govPension)` 元／月 |
| 年提領額 × 12 | `fmtWan(calcs.aw)` 元／年 |
| ÷ SWR (`params.swr`%) | |

**Result:** 目標總額 → `fmtWan(calcs.tt)` 元

---

### 退休缺口 (`"gap"`)

**Description:** 退休目標總額與現有淨資產之間的差距，即目前尚需繼續累積的金額。

**Steps:**
| Label | Value |
|---|---|
| 退休目標總額 | `fmtWan(calcs.tt)` 元 |
| 現有淨資產 | `fmtWan(netAssets)` 元 |

**Result:** 退休缺口 → `calcs.gap === 0 ? "已達標" : fmtWan(calcs.gap) + " 元"`

---

### 財務自由預測 (`"fi"`)

**Description:** 從現在起，每年將資產以積累期報酬率複利成長，並持續加入每月投入，模擬何時首次達到退休目標總額。

**Steps:**
| Label | Value |
|---|---|
| 起始淨資產 | `fmtWan(netAssets)` 元 |
| 每年加入（月投入×12） | `fmtWan(params.monthlyContrib * 12)` 元 |
| 積累期年化報酬 | `params.accRate`% |
| 退休目標總額 | `fmtWan(calcs.tt)` 元 |

**Result:** 財務自由年齡 → `calcs.fiAge ? calcs.fiAge + "歲（" + calcs.fiYear + "年）" : "100歲以上"`

---

### 被動收入覆蓋 (`"passive"`)

**Description:** 以現有投資資產假設 4% 年化股息率，計算每月能產生多少被動收入，並衡量可覆蓋退休後月支出的比例。

**Steps:**
| Label | Value |
|---|---|
| 投資資產 | `fmtWan(totalInvestment)` 元 |
| × 4% 股息假設 ÷ 12 | |
| 月被動收入 | `fmtWan(calcs.monthlyPassive)` 元 |
| 退休後月支出（通膨後） | `fmtWan(calcs.fme)` 元 |

**Result:** 覆蓋率 → `calcs.passiveCoverage.toFixed(1)`%

---

### 目標達成率 (`"goal"`)

**Description:** 現有淨資產佔退休目標總額的百分比，反映目前距離退休目標的累積進度。

**Steps:**
| Label | Value |
|---|---|
| 現有淨資產 | `fmtWan(netAssets)` 元 |
| 退休目標總額 | `fmtWan(calcs.tt)` 元 |

**Result:** 達成率 → `calcs.goalPct.toFixed(1)`%

---

## Implementation Scope

- All changes in `RetirementPage.tsx` only — no new files, no new packages
- `InfoModal` is a new sub-component inside the same file
- `MetricCard` receives an optional `onClick` prop
- The goal progress bar section wraps its outer `div` with an `onClick` handler
- No animation library needed — CSS `transition` on opacity/scale is sufficient

## Out of Scope

- Tooltip on hover (click only)
- Edit shortcuts from within the modal
- Animation beyond simple fade-in
