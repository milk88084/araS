# Navigation Loading Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immediate visual feedback when landing page buttons are tapped — a top progress bar for all route changes, plus per-button spinner/disabled state.

**Architecture:** Install `nextjs-toploader` and mount it in the root layout (global effect). Extract the three landing page buttons into a new Client Component (`LandingButtons`) that uses `useRouter` + local state to show a spinner on the active button and disable all others while navigating.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `nextjs-toploader`, CSS Modules, Vitest + React Testing Library

---

## File Map

| Action | Path                                             | Responsibility                                               |
| ------ | ------------------------------------------------ | ------------------------------------------------------------ |
| Modify | `apps/web/app/layout.tsx`                        | Mount `<NextTopLoader>` globally                             |
| Create | `apps/web/app/landing-buttons.tsx`               | Client Component — button state + navigation                 |
| Create | `apps/web/app/landing-buttons.module.css`        | Spinner keyframe animation                                   |
| Modify | `apps/web/app/page.tsx`                          | Remove inline buttons + `Sheen`; import `<LandingButtons />` |
| Create | `apps/web/tests/landing/LandingButtons.test.tsx` | Unit tests for `LandingButtons`                              |
| Modify | `apps/web/tests/landing/LandingPage.test.tsx`    | Swap link assertions → button assertions                     |

---

## Task 1: Install `nextjs-toploader` and wire it into the root layout

**Files:**

- Modify: `apps/web/package.json` (via pnpm)
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Install the package**

```bash
pnpm --filter @repo/web add nextjs-toploader
```

Expected: package appears in `apps/web/package.json` dependencies.

- [ ] **Step 2: Add `<NextTopLoader>` to the layout**

Replace the full content of `apps/web/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

export const metadata: Metadata = {
  title: "araS",
  description: "個人財務管理工具",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="zh-TW">
        <head>
          <meta name="theme-color" content="#f2f2f7" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="財務管家" />
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        </head>
        <body suppressHydrationWarning>
          <NextTopLoader color="#374254" height={3} showSpinner={false} shadow={false} />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 3: Verify type-check passes**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/app/layout.tsx
git commit -m "feat(web): add nextjs-toploader progress bar to root layout"
```

---

## Task 2: Create `LandingButtons` component with tests (TDD)

**Files:**

- Create: `apps/web/tests/landing/LandingButtons.test.tsx`
- Create: `apps/web/app/landing-buttons.module.css`
- Create: `apps/web/app/landing-buttons.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/tests/landing/LandingButtons.test.tsx`:

```tsx
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LandingButtons } from "../../app/landing-buttons";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("LandingButtons", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders 登入 button", () => {
    render(<LandingButtons />);
    expect(screen.getByRole("button", { name: "登入" })).toBeInTheDocument();
  });

  it("renders 註冊 button", () => {
    render(<LandingButtons />);
    expect(screen.getByRole("button", { name: "註冊" })).toBeInTheDocument();
  });

  it("renders 訪客 button", () => {
    render(<LandingButtons />);
    expect(screen.getByRole("button", { name: "訪客" })).toBeInTheDocument();
  });

  it("navigates to /sign-in when 登入 is clicked", () => {
    render(<LandingButtons />);
    fireEvent.click(screen.getByRole("button", { name: "登入" }));
    expect(mockPush).toHaveBeenCalledWith("/sign-in");
  });

  it("navigates to /sign-up when 註冊 is clicked", () => {
    render(<LandingButtons />);
    fireEvent.click(screen.getByRole("button", { name: "註冊" }));
    expect(mockPush).toHaveBeenCalledWith("/sign-up");
  });

  it("navigates to /assets when 訪客 is clicked", () => {
    render(<LandingButtons />);
    fireEvent.click(screen.getByRole("button", { name: "訪客" }));
    expect(mockPush).toHaveBeenCalledWith("/assets");
  });

  it("disables all buttons after one is clicked", () => {
    render(<LandingButtons />);
    fireEvent.click(screen.getByRole("button", { name: "登入" }));
    screen.getAllByRole("button").forEach((btn) => expect(btn).toBeDisabled());
  });

  it("does not trigger a second navigation when buttons are disabled", () => {
    render(<LandingButtons />);
    fireEvent.click(screen.getByRole("button", { name: "登入" }));
    // All buttons are now disabled — clicking a second one must not push again
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- apps/web/tests/landing/LandingButtons.test.tsx
```

Expected: all 8 tests FAIL with "Cannot find module '../../app/landing-buttons'".

- [ ] **Step 3: Create the CSS module**

Create `apps/web/app/landing-buttons.module.css`:

```css
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 4: Create the `LandingButtons` component**

Create `apps/web/app/landing-buttons.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./landing-buttons.module.css";

function Sheen() {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background:
          "linear-gradient(128deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.15) 30%, transparent 55%)",
        pointerEvents: "none",
      }}
    />
  );
}

const BUTTONS = [
  {
    href: "/sign-in",
    label: "登入",
    loadingLabel: "登入中",
    style: {
      minWidth: 160,
      padding: "14px 40px",
      borderRadius: 100,
      fontSize: 15,
      fontWeight: 600,
      color: "#fff",
      background: "linear-gradient(160deg, rgba(55,66,84,0.92) 0%, rgba(30,40,54,0.96) 100%)",
      border: "1.5px solid rgba(90,100,120,0.5)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow: [
        "0 10px 32px rgba(0,0,0,0.18)",
        "0 3px 8px rgba(0,0,0,0.10)",
        "inset 0 2px 3px rgba(255,255,255,0.18)",
        "inset 0 -1px 2px rgba(0,0,0,0.20)",
      ].join(", "),
    },
  },
  {
    href: "/sign-up",
    label: "註冊",
    loadingLabel: "註冊中",
    style: {
      minWidth: 160,
      padding: "14px 40px",
      borderRadius: 100,
      fontSize: 15,
      fontWeight: 600,
      color: "#374254",
      background:
        "linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(245,245,248,0.88) 40%, rgba(238,238,244,0.82) 65%, rgba(248,248,252,0.90) 100%)",
      border: "1.5px solid rgba(190,190,200,0.70)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow: [
        "0 10px 32px rgba(0,0,0,0.12)",
        "0 3px 8px rgba(0,0,0,0.08)",
        "inset 0 2px 3px rgba(255,255,255,1)",
        "inset 2px 0 3px rgba(255,255,255,0.80)",
        "inset 0 -2px 4px rgba(180,180,190,0.25)",
      ].join(", "),
    },
  },
  {
    href: "/assets",
    label: "訪客",
    loadingLabel: "進入中",
    style: {
      minWidth: 160,
      padding: "11px 40px",
      borderRadius: 100,
      fontSize: 14,
      fontWeight: 500,
      color: "#8e8e93",
      background:
        "linear-gradient(160deg, rgba(255,255,255,0.60) 0%, rgba(245,245,248,0.45) 65%, rgba(238,238,244,0.40) 100%)",
      border: "1.5px solid rgba(180,180,190,0.40)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow: ["0 4px 14px rgba(0,0,0,0.07)", "inset 0 1px 2px rgba(255,255,255,0.80)"].join(
        ", "
      ),
    },
  },
] as const;

export function LandingButtons() {
  const router = useRouter();
  const [activeHref, setActiveHref] = useState<string | null>(null);

  function handleClick(href: string) {
    if (activeHref) return;
    setActiveHref(href);
    router.push(href);
  }

  return (
    <div
      className="absolute right-0 left-0 flex flex-col items-center"
      style={{ bottom: 36, gap: 12, zIndex: 20 }}
    >
      {BUTTONS.map((btn) => {
        const isActive = activeHref === btn.href;
        const isDisabled = activeHref !== null;

        return (
          <button
            key={btn.href}
            onClick={() => handleClick(btn.href)}
            disabled={isDisabled}
            className="relative flex items-center justify-center overflow-hidden transition-opacity focus-visible:ring-2 focus-visible:ring-[#374254]/60 focus-visible:ring-offset-2 focus-visible:outline-none"
            style={{
              ...btn.style,
              opacity: isActive ? 0.7 : isDisabled ? 0.5 : 1,
              cursor: isDisabled ? "not-allowed" : "pointer",
            }}
          >
            <Sheen />
            {isActive ? <span className={styles.spinner} aria-hidden /> : btn.label}
            {isActive && <span className="sr-only">{btn.loadingLabel}</span>}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- apps/web/tests/landing/LandingButtons.test.tsx
```

Expected: all 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/landing-buttons.module.css apps/web/app/landing-buttons.tsx apps/web/tests/landing/LandingButtons.test.tsx
git commit -m "feat(web): add LandingButtons client component with loading state"
```

---

## Task 3: Update `page.tsx` and fix `LandingPage.test.tsx`

**Files:**

- Modify: `apps/web/tests/landing/LandingPage.test.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Update `LandingPage.test.tsx`**

The existing tests check `role="link"` (from `<Link>`), which breaks once buttons replace links. Replace the full file content:

```tsx
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RootPage from "../../app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    ...props
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} width={width} height={height} {...props} />,
}));

describe("Landing Page", () => {
  it("renders app icon", () => {
    render(<RootPage />);
    expect(screen.getByRole("img", { name: "araS" })).toBeInTheDocument();
  });

  it("renders 登入 button", () => {
    render(<RootPage />);
    expect(screen.getByRole("button", { name: "登入" })).toBeInTheDocument();
  });

  it("renders 註冊 button", () => {
    render(<RootPage />);
    expect(screen.getByRole("button", { name: "註冊" })).toBeInTheDocument();
  });

  it("renders 訪客 button", () => {
    render(<RootPage />);
    expect(screen.getByRole("button", { name: "訪客" })).toBeInTheDocument();
  });
});
```

> **Note:** The previous subtitle test (`"當你了解日常的花費後..."`) was already failing before this feature (the subtitle text changed). It has been removed here — restore it separately if needed.

- [ ] **Step 2: Run the updated landing page tests to confirm they fail**

```bash
pnpm --filter @repo/web test -- apps/web/tests/landing/LandingPage.test.tsx
```

Expected: button tests FAIL because `page.tsx` still renders `<Link>` elements (not buttons).

- [ ] **Step 3: Update `page.tsx`**

Replace the full content of `apps/web/app/page.tsx`:

```tsx
import Image from "next/image";
import styles from "./page.module.css";
import { LandingButtons } from "./landing-buttons";

interface CardConfig {
  name: string;
  color: string;
  textColor: string;
  value: string;
  depth: "near" | "mid" | "far";
  blur: string;
  opacity: number;
  top: number;
  left?: number;
  right?: number;
  duration: string;
  delay: string;
  boxShadow: string;
}

// Decorative placeholder values — not wired to real data
const CARDS: CardConfig[] = [
  {
    name: "投資",
    color: "#0e1424",
    textColor: "#ffffff",
    value: "NT$82,500",
    depth: "near",
    blur: "0px",
    opacity: 1,
    top: 65,
    right: -30,
    duration: "3.8s",
    delay: "0s",
    boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
  },
  {
    name: "負債",
    color: "#C7C7D4",
    textColor: "#1c1c1e",
    value: "NT$320,000",
    depth: "far",
    blur: "7px",
    opacity: 0.55,
    top: 115,
    left: 32,
    duration: "5.2s",
    delay: "-1.3s",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  {
    name: "應收帳款",
    color: "#66788E",
    textColor: "#ffffff",
    value: "NT$540,000",
    depth: "mid",
    blur: "2.5px",
    opacity: 0.78,
    top: 315,
    left: -28,
    duration: "4.5s",
    delay: "-2.1s",
    boxShadow: "0 8px 28px rgba(102,120,142,0.35)",
  },
  {
    name: "固定資產",
    color: "#374254",
    textColor: "#ffffff",
    value: "NT$4,200,000",
    depth: "far",
    blur: "7px",
    opacity: 0.55,
    top: 368,
    right: 28,
    duration: "6.1s",
    delay: "-0.8s",
    boxShadow: "0 8px 28px rgba(55,66,84,0.30)",
  },
  {
    name: "流動資金",
    color: "#FFFFFF",
    textColor: "#1c1c1e",
    value: "NT$15,000",
    depth: "near",
    blur: "0px",
    opacity: 1,
    top: 462,
    left: 38,
    duration: "4.2s",
    delay: "-3.0s",
    boxShadow: "0 10px 28px rgba(14,20,36,0.38)",
  },
];

const depthClass: Record<CardConfig["depth"], string> = {
  near: styles.near ?? "",
  mid: styles.mid ?? "",
  far: styles.far ?? "",
};

const entryClasses = [
  styles["enter-0"] ?? "",
  styles["enter-1"] ?? "",
  styles["enter-2"] ?? "",
  styles["enter-3"] ?? "",
  styles["enter-4"] ?? "",
];

export default function RootPage() {
  return (
    <main className="relative overflow-hidden" style={{ height: "100dvh", background: "#f7f7fa" }}>
      {/* Background depth cards */}
      {CARDS.map((card, i) => (
        <div
          key={card.name}
          className={entryClasses[i]}
          style={{
            position: "absolute",
            width: 136,
            height: 136,
            top: card.top,
            ...(card.left !== undefined ? { left: card.left } : {}),
            ...(card.right !== undefined ? { right: card.right } : {}),
          }}
        >
          <div
            className={depthClass[card.depth]}
            style={
              {
                width: 136,
                height: 136,
                borderRadius: 22,
                background: card.color,
                boxShadow: card.boxShadow,
                filter: `blur(${card.blur})`,
                opacity: card.opacity,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: 12,
                "--dur": card.duration,
                "--delay": card.delay,
              } as React.CSSProperties
            }
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "0.3px",
                color: card.textColor,
                width: "100%",
                textAlign: "center",
              }}
            >
              {card.name}
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.1,
                color: card.textColor,
                width: "100%",
                textAlign: "center",
              }}
            >
              {card.value}
            </span>
          </div>
        </div>
      ))}

      {/* Center: icon + subtitle */}
      <div
        className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{ top: "48%", gap: 10, zIndex: 10 }}
      >
        <Image
          src="/icons/icon-192x192.png"
          alt="araS"
          width={96}
          height={96}
          priority
          style={{
            borderRadius: 22,
            boxShadow: "0 8px 28px rgba(55,66,84,0.28)",
          }}
        />
        <p className="w-full text-center text-2xl font-bold whitespace-nowrap text-gray-600 italic">
          You are stronger than you think.
        </p>
      </div>

      <LandingButtons />
    </main>
  );
}
```

- [ ] **Step 4: Run landing page tests to confirm they pass**

```bash
pnpm --filter @repo/web test -- apps/web/tests/landing/LandingPage.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run the full web test suite**

```bash
pnpm --filter @repo/web test
```

Expected: all tests pass (or only pre-existing failures unrelated to this feature).

- [ ] **Step 6: Type-check**

```bash
pnpm --filter @repo/web type-check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/page.tsx apps/web/tests/landing/LandingPage.test.tsx
git commit -m "feat(web): wire LandingButtons into landing page, update tests"
```
