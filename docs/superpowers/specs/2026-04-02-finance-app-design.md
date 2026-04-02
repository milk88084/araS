# Personal Finance Management App — Design Spec

**Date:** 2026-04-02  
**Stack:** Next.js 15 + Express 4 + PostgreSQL + Prisma 6 + Zustand + Lucide React + Tailwind CSS 4  
**Scope:** Full replacement of existing template into a mobile-first personal finance app. Single user, no authentication.

---

## 1. Architecture

### Monorepo Structure (unchanged)

```
apps/
  web/   → Next.js 15 App Router (frontend + UI)
  api/   → Express 4 + Prisma (REST API + Yahoo Finance proxy)
packages/
  shared/  → Zod schemas shared between web and api
  ui/      → shadcn/ui components (retained)
```

### What Gets Deleted

- All Clerk references: `middleware.ts`, `@clerk/nextjs` dep, `clerkAuth`, `requireAuthentication`, `requireRole` in api
- All Posts functionality: controllers, services, routes, web pages
- `User` model in Prisma (no auth = no user concept)
- `apps/web/app/(dashboard)/` route group

### New Dependencies

- `apps/web`: `zustand`, `lucide-react`
- `apps/api`: none (use native `fetch` for Yahoo Finance proxy)

---

## 2. Routing (`apps/web/app/`)

```
app/
  layout.tsx                  ← Root layout with BottomNav
  page.tsx                    ← Redirects to /dashboard
  (finance)/
    layout.tsx                ← Finance shell layout (max-w mobile container)
    dashboard/
      page.tsx                ← Dashboard view
    assets/
      page.tsx                ← Assets & Liabilities view
    transactions/
      page.tsx                ← Income/Expense view (placeholder)
    insurance/
      page.tsx                ← Insurance view (placeholder)
    more/
      page.tsx                ← More view (placeholder)
```

---

## 3. Data Models (Prisma)

```prisma
model Asset {
  id        String   @id @default(cuid())
  name      String
  category  String   // "不動產" | "存款" | "現金" | "其他"
  value     Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Liability {
  id        String   @id @default(cuid())
  name      String
  category  String   // "房貸" | "車貸" | "信用卡" | "其他"
  balance   Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Transaction {
  id        String   @id @default(cuid())
  type      String   // "income" | "expense"
  amount    Float
  category  String   // "餐飲" | "交通" | "薪資" | etc.
  source    String   // "daily" | "emergency" | "excluded"
  note      String?
  date      DateTime
  createdAt DateTime @default(now())
}

model PortfolioItem {
  id        String   @id @default(cuid())
  symbol    String   // "0050.TW" | "VOO"
  name      String   // "元大台灣50"
  avgCost   Float    // average cost per share
  shares    Float    // number of shares held
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 4. Backend API (`apps/api`)

### Endpoints

| Method | Path                    | Description                                                 |
| ------ | ----------------------- | ----------------------------------------------------------- |
| GET    | `/api/quotes/:symbol`   | Yahoo Finance proxy — returns `{ symbol, price, currency }` |
| GET    | `/api/assets`           | List all assets                                             |
| POST   | `/api/assets`           | Create asset                                                |
| PUT    | `/api/assets/:id`       | Update asset                                                |
| DELETE | `/api/assets/:id`       | Delete asset                                                |
| GET    | `/api/liabilities`      | List all liabilities                                        |
| POST   | `/api/liabilities`      | Create liability                                            |
| PUT    | `/api/liabilities/:id`  | Update liability                                            |
| DELETE | `/api/liabilities/:id`  | Delete liability                                            |
| GET    | `/api/transactions`     | List transactions (with `?month=YYYY-MM` filter)            |
| POST   | `/api/transactions`     | Create transaction                                          |
| DELETE | `/api/transactions/:id` | Delete transaction                                          |
| GET    | `/api/portfolio`        | List portfolio items                                        |
| POST   | `/api/portfolio`        | Add portfolio item                                          |
| PUT    | `/api/portfolio/:id`    | Update portfolio item                                       |
| DELETE | `/api/portfolio/:id`    | Delete portfolio item                                       |

### Yahoo Finance Proxy

- Endpoint: `GET /api/quotes/:symbol`
- Fetches from Yahoo Finance v8 chart API: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d`
- Extracts `meta.regularMarketPrice` and `meta.currency`
- Returns `{ symbol, price, currency }` or `{ error }` with appropriate status

### Architecture Pattern (same as existing)

- Controllers handle HTTP parsing → call services
- Services contain business logic → call Prisma
- All responses use `sendSuccess` / `sendError` envelope
- No auth middleware (Clerk removed entirely)

---

## 5. Frontend State (`apps/web`)

### Zustand Stores

**`useFinanceStore`** — persists to backend via fetch

```ts
{
  assets: Asset[]
  liabilities: Liability[]
  transactions: Transaction[]
  portfolio: PortfolioItem[]
  fetchAll: () => Promise<void>
  addAsset: (data) => Promise<void>
  addLiability: (data) => Promise<void>
  addTransaction: (data) => Promise<void>
  addPortfolioItem: (data) => Promise<void>
  deleteTransaction: (id) => Promise<void>
}
```

**`useQuoteStore`** — ephemeral (not persisted)

```ts
{
  quotes: Record<string, { price: number; currency: string; updatedAt: Date }>;
  loading: boolean;
  refreshQuotes: (symbols: string[]) => Promise<void>;
}
```

### Derived Calculations (computed in components/hooks)

- `totalAssets` = sum of all `Asset.value` + portfolio market values
- `totalLiabilities` = sum of all `Liability.balance`
- `netWorth` = totalAssets - totalLiabilities
- `monthlyDisposable` = current month income - current month expense (from transactions)
- Per portfolio item: `marketValue = price × shares`, `unrealizedPL = marketValue - (avgCost × shares)`, `returnRate = unrealizedPL / (avgCost × shares) × 100`

---

## 6. UI Components

### Layout

- **`BottomNav`**: 5 tabs — Dashboard (Home), Assets (Building2), Transactions (BarChart3), Insurance (Shield), More (MoreHorizontal). Fixed bottom, white bg, border-top.
- **Finance shell layout**: `max-w-md mx-auto`, `pb-20` (space for bottom nav), `bg-gray-50 min-h-screen`

### Dashboard Page

- **DisposableBalanceHeader**: Large number at top, red badge if negative ("透支"), green if positive
- **NetWorthCard**: `rounded-2xl shadow-sm bg-white` — shows net worth, total assets, total liabilities in a 3-column layout
- **QuickActionsGrid**: 2×2 grid — 紀錄生活, 更新存款, 配置資產, 新增負債
- **RecentTransactionsList**: Last 5 transactions, amount colored red/green by type

### Assets Page

- **NetWorthHero**: Large net worth number at top
- **AssetLiabilityTabs**: Two tabs — 資產 / 負債
- **AssetCategoryList**: Grouped by category, each group expandable, items show name + value
- **PortfolioSection** (inside 資產 tab): List of portfolio items with symbol, name, current price, unrealized P/L badge, refresh button
- **AddPortfolioItemModal**: Bottom sheet with fields: symbol, name, avgCost, shares

### Bottom Sheet Form (紀錄生活)

- **TransactionBottomSheet**: Slides up from bottom (`translate-y` transition)
  - Toggle: 支出 / 收入
  - Amount input with TWD prefix
  - Category select (dropdown)
  - Date picker (native `<input type="date">`)
  - Note textarea
  - Source button group: 日常開銷 / 緊急備用金 / 不計入預算
  - Submit button

---

## 7. Design Tokens

All from existing `globals.css @theme` + Tailwind utility classes:

| Purpose                 | Class                               |
| ----------------------- | ----------------------------------- |
| Page background         | `bg-gray-50`                        |
| Card                    | `bg-white rounded-2xl shadow-sm`    |
| Positive (income/gain)  | `text-green-700` / `bg-green-50`    |
| Negative (expense/loss) | `text-red-500` / `bg-red-50`        |
| Neutral label           | `text-gray-500 text-sm`             |
| Primary action button   | `bg-gray-900 text-white rounded-xl` |

---

## 7b. Shared Schemas (`packages/shared`)

New Zod schemas to add (replacing existing post schemas):

- `assetSchema` / `createAssetSchema`
- `liabilitySchema` / `createLiabilitySchema`
- `transactionSchema` / `createTransactionSchema`
- `portfolioItemSchema` / `createPortfolioItemSchema`

Used for both API request validation (Express) and form validation (React).

---

## 8. Error Handling

- API fetch errors in Zustand actions are caught and stored as `error: string | null` state; shown as a toast-style banner at page top
- Quote fetch failures show last known price with a stale indicator rather than breaking the UI
- Form validation uses Zod schemas from `@repo/shared`; errors shown inline below each field

---

## 9. PWA Support

使用 `next-pwa`（基於 Workbox）讓 App 可安裝至手機主畫面。

**實作範圍：**

- `next.config.ts` 整合 `next-pwa`，production 啟用 service worker，dev 停用
- `public/manifest.json`：App 名稱（「財務管家」）、short_name、`display: "standalone"`、`start_url: "/dashboard"`、`background_color: "#FAFAFA"`、`theme_color: "#111827"`
- App icons：`public/icons/` 放置 192×192 與 512×512 PNG（簡單深色背景 + 白色 ¥ 符號）
- `apps/web/app/layout.tsx` 加入 `<link rel="manifest">` 與 `<meta name="theme-color">` 與 `<meta name="apple-mobile-web-app-capable">`
- Service worker 策略：NetworkFirst for API calls，CacheFirst for static assets

**不包含：**

- Offline support / background sync
- Push notifications

---

## 10. What Is NOT in Scope

- Multi-currency conversion (display currency as-is from API)
- Charts/graphs (numbers only, no canvas/SVG graphs)
- Insurance page functionality (skeleton only)
- More page functionality (skeleton only)
- Dark mode (light mode only)
- Offline support / background sync
- Push notifications
