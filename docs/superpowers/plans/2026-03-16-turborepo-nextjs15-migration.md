# Turborepo + Next.js 15 Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing React 18 + Vite + Express monorepo to a Turborepo-powered monorepo with Next.js 15 App Router (`apps/web`) and Express (`apps/api`), shared UI components (`packages/ui`), and a shared ESLint config (`packages/eslint-config`).

**Architecture:** Incremental migration — move and rename files without rewriting any business logic. `apps/api` is a near-verbatim copy of `packages/server` with only the package name and CORS default changed. `apps/web` is a new Next.js 15 app whose components are ported from `packages/client` with routing and auth adapted for the App Router.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, @clerk/nextjs, Turborepo 2, pnpm workspaces, Express 4, Prisma 6, Vitest, TypeScript 5 strict

**Spec:** `docs/superpowers/specs/2026-03-16-turborepo-nextjs15-migration-design.md`

---

## Chunk 1: Foundation — Turborepo, Workspace, ESLint Config

### Task 1: Install Turbo and update root package.json

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install turbo at root**

```bash
pnpm add -D turbo@latest -w
```

Expected: turbo added to root `devDependencies`

- [ ] **Step 2: Update root package.json scripts to use turbo**

Replace the `scripts` block in `package.json` with:

```json
"scripts": {
  "dev": "turbo run dev",
  "build": "turbo run build",
  "lint": "turbo run lint",
  "type-check": "turbo run type-check",
  "test": "turbo run test",
  "test:coverage": "turbo run test -- --coverage",
  "test:e2e": "playwright test",
  "db:generate": "pnpm --filter @repo/api db:generate",
  "db:push": "pnpm --filter @repo/api db:push",
  "db:migrate": "pnpm --filter @repo/api db:migrate",
  "db:migrate:deploy": "pnpm --filter @repo/api db:migrate:deploy",
  "db:rollback": "pnpm --filter @repo/api db:rollback",
  "db:studio": "pnpm --filter @repo/api db:studio",
  "docker:up": "docker compose up -d",
  "docker:down": "docker compose down",
  "prepare": "husky"
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(turbo): install turborepo and update root scripts"
```

---

### Task 2: Write turbo.json

**Files:**

- Create: `turbo.json`

- [ ] **Step 1: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDotEnv": [".env"],
  "remoteCache": {},
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^type-check"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false
    }
  }
}
```

- [ ] **Step 2: Verify turbo resolves the graph**

```bash
pnpm turbo run build --dry
```

Expected: Output shows task graph. No error about missing packages (packages/client and packages/server don't have turbo tasks yet — that's fine at this stage).

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "build(turbo): add turbo.json with full pipeline"
```

---

### Task 3: Update pnpm-workspace.yaml and .npmrc

**Files:**

- Modify: `pnpm-workspace.yaml`
- Create: `.npmrc`

- [ ] **Step 1: Update pnpm-workspace.yaml**

Replace the entire file content:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Create .npmrc**

```
shamefully-hoist=false
strict-peer-dependencies=false
```

- [ ] **Step 3: Commit**

```bash
git add pnpm-workspace.yaml .npmrc
git commit -m "build(workspace): add apps/* to workspace, add .npmrc"
```

---

### Task 4: Update tsconfig.base.json with additional strict settings

**Files:**

- Modify: `tsconfig.base.json`

- [ ] **Step 1: Add strict settings to tsconfig.base.json**

Add these fields inside `"compilerOptions"` in `tsconfig.base.json` (the file already has `"strict": true`):

```json
"noUncheckedIndexedAccess": true,
"noImplicitReturns": true,
"exactOptionalPropertyTypes": true
```

Final `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- [ ] **Step 2: Run existing type-check to ensure nothing breaks**

```bash
pnpm --filter @repo/server type-check
pnpm --filter @repo/shared type-check
```

Expected: Both pass (or produce only pre-existing errors if any).

- [ ] **Step 3: Commit**

```bash
git add tsconfig.base.json
git commit -m "build(ts): add noUncheckedIndexedAccess, noImplicitReturns, exactOptionalPropertyTypes"
```

---

### Task 5: Create packages/eslint-config

**Files:**

- Create: `packages/eslint-config/package.json`
- Create: `packages/eslint-config/index.js`
- Create: `packages/eslint-config/react.js`
- Create: `packages/eslint-config/next.js`

- [ ] **Step 1: Create packages/eslint-config/package.json**

```json
{
  "name": "@repo/eslint-config",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./react": "./react.js",
    "./next": "./next.js"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.3",
    "@next/eslint-plugin-next": "^15.0.0",
    "eslint": "^9.15.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "typescript-eslint": "^8.56.1"
  },
  "peerDependencies": {
    "eslint": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create packages/eslint-config/index.js (base TS/JS config)**

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/** @type {import("typescript-eslint").ConfigArray} */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["**/dist/", "**/node_modules/", "**/.next/", "**/coverage/"],
  },
];

export default baseConfig;
```

- [ ] **Step 3: Create packages/eslint-config/react.js (React + hooks rules)**

```js
import { baseConfig } from "./index.js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

/** @type {import("typescript-eslint").ConfigArray} */
export const reactConfig = [
  ...baseConfig,
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
];

export default reactConfig;
```

- [ ] **Step 4: Create packages/eslint-config/next.js (Next.js rules)**

```js
import { reactConfig } from "./react.js";
import nextPlugin from "@next/eslint-plugin-next";

/** @type {import("typescript-eslint").ConfigArray} */
export const nextConfig = [
  ...reactConfig,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];

export default nextConfig;
```

- [ ] **Step 5: Install deps for eslint-config package**

```bash
pnpm --filter @repo/eslint-config install
```

- [ ] **Step 6: Delete the root eslint.config.mjs**

The per-package ESLint configs (added in Chunks 4 and 5 when `apps/web` and `apps/api` ESLint configs are wired up) replace this file. Delete it now so it cannot conflict:

```bash
rm eslint.config.mjs
```

- [ ] **Step 7: Commit**

```bash
git add packages/eslint-config/
git rm eslint.config.mjs
git commit -m "build(eslint): add shared eslint-config package, remove root eslint.config.mjs"
```

---

## Chunk 2: packages/ui — Shared Component Library

### Task 6: Create packages/ui scaffold

**Files:**

- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/lib/utils.ts`

- [ ] **Step 1: Create packages/ui/package.json**

```json
{
  "name": "@repo/ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*.tsx",
    "./lib/utils": "./src/lib/utils.ts"
  },
  "scripts": {
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Create packages/ui/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "paths": {
      "@repo/ui/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 3: Create packages/ui/src/lib/utils.ts**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Install packages/ui deps**

```bash
pnpm --filter @repo/ui install
```

- [ ] **Step 5: Commit**

```bash
git add packages/ui/
git commit -m "build(ui): scaffold packages/ui with package.json, tsconfig, utils"
```

---

### Task 7: Move Button and Card components to packages/ui

**Files:**

- Create: `packages/ui/src/components/button.tsx`
- Create: `packages/ui/src/components/card.tsx`
- Create: `packages/ui/src/index.ts`

- [ ] **Step 1: Create packages/ui/src/components/button.tsx**

Copy from `packages/client/src/components/ui/Button.tsx`, update the `cn` import path:

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 2: Create packages/ui/src/components/card.tsx**

Copy from `packages/client/src/components/ui/Card.tsx`, update the `cn` import path:

```tsx
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../lib/utils.js";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("bg-card text-card-foreground rounded-lg border shadow-sm", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-muted-foreground text-sm", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
```

- [ ] **Step 3: Create packages/ui/src/index.ts**

```ts
export { Button, buttonVariants } from "./components/button.js";
export type { ButtonProps } from "./components/button.js";
export { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/card.js";
```

- [ ] **Step 4: Run type-check on packages/ui**

```bash
pnpm --filter @repo/ui type-check
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/
git commit -m "feat(ui): add Button and Card components to shared ui package"
```

---

## Chunk 3: apps/api — Move Express Server

### Task 8: Copy packages/server to apps/api

**Files:**

- Create: `apps/api/` (entire directory, copied from `packages/server/`)

- [ ] **Step 1: Create apps/api by copying packages/server**

```bash
cp -r packages/server apps/api
```

- [ ] **Step 2a: Update apps/api/package.json — rename package**

Change `"name"` from `"@repo/server"` to `"@repo/api"`.

- [ ] **Step 2b: Update CORS default in apps/api/src/lib/env.ts**

Find this line:

```ts
CORS_ORIGIN: z.string().default("http://localhost:5173"),
```

Replace with:

```ts
CORS_ORIGIN: z
  .string()
  .default("http://localhost:5173,http://localhost:3000"),
```

- [ ] **Step 3: Update apps/api/tsconfig.json — fix paths to shared**

In `apps/api/tsconfig.json`, the `paths` currently point to `../shared/src`. Update to `../../packages/shared/src`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "paths": {
      "@/*": ["./src/*"],
      "@repo/shared": ["../../packages/shared/src/index.ts"],
      "@repo/shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Update workspace reference in apps/api/package.json**

In `apps/api/package.json`, the `@repo/shared` dependency is already `"workspace:*"` — this resolves correctly via pnpm workspace. No change needed.

- [ ] **Step 5: Install apps/api deps**

```bash
pnpm install
```

Expected: pnpm resolves workspace packages including `@repo/shared` and `@repo/api`.

- [ ] **Step 6: Run type-check on apps/api**

```bash
pnpm --filter @repo/api type-check
```

Expected: PASS

- [ ] **Step 7: Run tests on apps/api**

```bash
pnpm --filter @repo/api test
```

Expected: PASS (same tests as packages/server, now under apps/api)

- [ ] **Step 8: Commit**

```bash
git add apps/api/
git commit -m "feat(api): create apps/api by moving packages/server (rename + CORS default update)"
```

---

## Chunk 4: apps/web Foundation — Next.js 15 Setup

### Task 9: Create Next.js 15 app scaffold

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/next-env.d.ts`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "@repo/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@clerk/nextjs": "^6.0.0",
    "@repo/shared": "workspace:*",
    "@repo/ui": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.3",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "allowJs": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@repo/shared": ["../../packages/shared/src/index.ts"],
      "@repo/shared/*": ["../../packages/shared/src/*"],
      "@repo/ui": ["../../packages/ui/src/index.ts"],
      "@repo/ui/*": ["../../packages/ui/src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create apps/web/next-env.d.ts**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 4: Create apps/web/next.config.ts with security headers and API proxy**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    taint: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://clerk.production.lc.accounts.dev https://*.clerk.accounts.dev",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://clerk.production.lc.accounts.dev https://*.clerk.accounts.dev",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 5: Create apps/web/vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
});
```

Also add `@vitejs/plugin-react` to devDependencies in `apps/web/package.json`:

```json
"@vitejs/plugin-react": "^4.3.4"
```

- [ ] **Step 6: Install apps/web deps**

```bash
pnpm install
```

Expected: All workspace packages resolve.

- [ ] **Step 7: Commit**

```bash
git add apps/web/
git commit -m "feat(web): scaffold Next.js 15 app with tsconfig, next.config.ts, and vitest config"
```

---

### Task 10: Set up Tailwind CSS 4 and global styles

**Files:**

- Create: `apps/web/app/globals.css`
- Note: Tailwind 4 has no `tailwind.config.ts` — configuration lives in CSS via `@theme`

- [ ] **Step 1: Install Tailwind CSS 4 and PostCSS in apps/web**

```bash
pnpm --filter @repo/web add tailwindcss@next @tailwindcss/postcss@next postcss
```

- [ ] **Step 2: Create apps/web/postcss.config.js**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 3: Create apps/web/app/globals.css**

This migrates the Tailwind 3 CSS variable tokens to Tailwind 4 `@theme` block format.

In Tailwind 3: `--background: 0 0% 100%` (just HSL channels, used via `hsl(var(--background))` in config).
In Tailwind 4: `--color-background: hsl(0 0% 100%)` (full value, referenced as `bg-background` utility via `@theme`).

```css
@import "tailwindcss";

@theme {
  /* Light mode design tokens */
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(240 10% 3.9%);
  --color-card: hsl(0 0% 100%);
  --color-card-foreground: hsl(240 10% 3.9%);
  --color-primary: hsl(240 5.9% 10%);
  --color-primary-foreground: hsl(0 0% 98%);
  --color-secondary: hsl(240 4.8% 95.9%);
  --color-secondary-foreground: hsl(240 5.9% 10%);
  --color-muted: hsl(240 4.8% 95.9%);
  --color-muted-foreground: hsl(240 3.8% 46.1%);
  --color-accent: hsl(240 4.8% 95.9%);
  --color-accent-foreground: hsl(240 5.9% 10%);
  --color-destructive: hsl(0 84.2% 60.2%);
  --color-destructive-foreground: hsl(0 0% 98%);
  --color-border: hsl(240 5.9% 90%);
  --color-input: hsl(240 5.9% 90%);
  --color-ring: hsl(240 5.9% 10%);
  --radius: 0.5rem;
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

.dark {
  --color-background: hsl(240 10% 3.9%);
  --color-foreground: hsl(0 0% 98%);
  --color-card: hsl(240 10% 3.9%);
  --color-card-foreground: hsl(0 0% 98%);
  --color-primary: hsl(0 0% 98%);
  --color-primary-foreground: hsl(240 5.9% 10%);
  --color-secondary: hsl(240 3.7% 15.9%);
  --color-secondary-foreground: hsl(0 0% 98%);
  --color-muted: hsl(240 3.7% 15.9%);
  --color-muted-foreground: hsl(240 5% 64.9%);
  --color-accent: hsl(240 3.7% 15.9%);
  --color-accent-foreground: hsl(0 0% 98%);
  --color-destructive: hsl(0 62.8% 30.6%);
  --color-destructive-foreground: hsl(0 0% 98%);
  --color-border: hsl(240 3.7% 15.9%);
  --color-input: hsl(240 3.7% 15.9%);
  --color-ring: hsl(240 4.9% 83.9%);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings:
      "rlig" 1,
      "calt" 1;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/globals.css apps/web/postcss.config.js
git commit -m "feat(web): add Tailwind CSS 4 with migrated design tokens"
```

---

### Task 11: Set up Clerk middleware and root layout

**Files:**

- Create: `apps/web/middleware.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/lib/clerk.ts`

- [ ] **Step 1: Create apps/web/middleware.ts**

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/posts(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 2: Create apps/web/lib/clerk.ts**

Preserves the same opt-in Clerk pattern from the original client:

```ts
export const isClerkEnabled =
  !!process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] &&
  process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] !== "pk_test_your_publishable_key";
```

- [ ] **Step 3: Create apps/web/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkEnabled } from "../lib/clerk.js";
import "./globals.css";

export const metadata: Metadata = {
  title: "Production Template",
  description:
    "A production-ready Next.js + Express starter with Clerk auth, Prisma ORM, and comprehensive testing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (isClerkEnabled) {
    return (
      <html lang="en">
        <body>
          <ClerkProvider>{children}</ClerkProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Run type-check**

```bash
pnpm --filter @repo/web type-check
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/middleware.ts apps/web/lib/ apps/web/app/layout.tsx
git commit -m "feat(web): add Clerk middleware, root layout, and clerk feature flag"
```

---

## Chunk 5: apps/web Pages and Components Migration

### Task 12: Create shared layout components (Header and Footer)

**Files:**

- Create: `apps/web/components/layout/header.tsx`
- Create: `apps/web/components/layout/footer.tsx`

- [ ] **Step 1: Create apps/web/components/layout/header.tsx**

Adapted from `packages/client/src/components/layout/Header.tsx` — uses `next/link` instead of `react-router-dom`, `@clerk/nextjs` instead of `@clerk/clerk-react`:

```tsx
"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { isClerkEnabled } from "../../lib/clerk.js";

export function Header() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            Production Template
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            {isClerkEnabled ? (
              <SignedIn>
                <Link
                  href="/posts"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Posts
                </Link>
              </SignedIn>
            ) : (
              <Link
                href="/posts"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Posts
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isClerkEnabled ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">Clerk not configured</span>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create apps/web/components/layout/footer.tsx**

```tsx
export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="text-muted-foreground container mx-auto flex max-w-screen-xl items-center justify-between px-4 text-sm">
        <p>&copy; {new Date().getFullYear()} Production Template. All rights reserved.</p>
        <div className="flex gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/
git commit -m "feat(web): add Header and Footer layout components"
```

---

### Task 13: Create home page

**Files:**

- Create: `apps/web/app/page.tsx`

- [ ] **Step 1: Create apps/web/app/page.tsx**

Adapted from `packages/client/src/pages/HomePage.tsx` — uses `next/link`, `@clerk/nextjs`:

```tsx
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "@repo/ui";
import { Card, CardHeader, CardTitle, CardDescription } from "@repo/ui";
import { Header } from "../components/layout/header.js";
import { Footer } from "../components/layout/footer.js";
import { isClerkEnabled } from "../lib/clerk.js";

const features = [
  {
    title: "Clerk Authentication",
    description: "Secure user auth with role-based access control (admin, editor, viewer).",
  },
  {
    title: "Type-Safe API",
    description: "Express REST API with Zod validation and shared schemas across client/server.",
  },
  {
    title: "Prisma ORM",
    description: "PostgreSQL with Prisma 6, migrations, soft deletes, and full type safety.",
  },
  {
    title: "Full Test Suite",
    description:
      "Vitest + Supertest for unit/integration, Playwright for E2E, 80% coverage target.",
  },
  {
    title: "Production Security",
    description: "OWASP-compliant with Helmet, CORS, CSP, rate limiting, and input validation.",
  },
  {
    title: "Pino Monitoring",
    description:
      "Structured logging with metrics, P95 tracking, and configurable alert thresholds.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto max-w-screen-xl px-4 py-16">
          <section className="flex flex-col items-center gap-6 pb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Production
              <br />
              <span className="text-muted-foreground">Template</span>
            </h1>
            <p className="text-muted-foreground max-w-[42rem] leading-normal sm:text-xl sm:leading-8">
              A production-ready Next.js + Express starter with Clerk auth, Prisma ORM, and
              comprehensive testing. Clone and start shipping.
            </p>
            <div className="flex gap-4">
              {isClerkEnabled ? (
                <>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button size="lg">Get Started</Button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <Link href="/posts">
                      <Button size="lg">Go to Posts</Button>
                    </Link>
                  </SignedIn>
                </>
              ) : (
                <Link href="/posts">
                  <Button size="lg">Go to Posts</Button>
                </Link>
              )}
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg">
                  GitHub
                </Button>
              </a>
            </div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm --filter @repo/web type-check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(web): add home page (migrated from packages/client)"
```

---

### Task 14: Create posts page (protected dashboard route)

**Files:**

- Create: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/app/(dashboard)/posts/page.tsx`
- Create: `apps/web/lib/api-client.ts`

- [ ] **Step 1: Create apps/web/lib/api-client.ts**

Adapted from `packages/client/src/lib/api-client.ts` — removes `import.meta.env`, uses Next.js `process.env`:

```ts
import type { ApiResponse } from "@repo/shared";

const API_BASE = "/api";

class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    };

    const response = await fetch(url, { ...options, headers });
    return response.json() as Promise<ApiResponse<T>>;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
```

- [ ] **Step 2: Create apps/web/app/(dashboard)/layout.tsx**

This replaces the `ProtectedRoute` wrapper. When Clerk is enabled, the layout enforces auth. When Clerk is not configured, it passes through (same behavior as original).

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkEnabled } from "../../lib/clerk.js";
import { Header } from "../../components/layout/header.js";
import { Footer } from "../../components/layout/footer.js";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (isClerkEnabled) {
    const { userId } = await auth();
    if (!userId) {
      redirect("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 3: Create apps/web/app/(dashboard)/posts/page.tsx**

This is a Client Component — preserves the same interactivity as `PostsPage` in the original:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Post } from "@repo/shared";
import { Button } from "@repo/ui";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui";
import { isClerkEnabled } from "../../../lib/clerk.js";

export default function PostsPage() {
  const { getToken } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      const data = (await res.json()) as { success: boolean; data: Post[] };
      if (data.success) setPosts(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = isClerkEnabled ? await getToken() : null;
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title, content }),
    });
    const data = (await res.json()) as { success: boolean; data: Post };
    if (data.success) {
      setPosts((prev) => [data.data, ...prev]);
      setTitle("");
      setContent("");
    }
  };

  const handleDelete = async (id: string) => {
    const token = isClerkEnabled ? await getToken() : null;
    const res = await fetch(`/api/posts/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = (await res.json()) as { success: boolean };
    if (data.success) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Posts</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Create New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
            <input
              type="text"
              placeholder="Post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
            <textarea
              placeholder="Write your content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              className="bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
            <Button type="submit">Publish</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center">No posts yet. Create one above!</p>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <CardDescription>
                      {new Date(post.createdAt).toLocaleDateString()} &middot; {post.status}
                    </CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDelete(post.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{post.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run type-check**

```bash
pnpm --filter @repo/web type-check
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/ apps/web/lib/api-client.ts
git commit -m "feat(web): add posts page (protected dashboard route) and API client"
```

---

## Chunk 6: Finalization — .env, CI/CD, Hooks, Cleanup

### Task 15: Update .env.example

**Files:**

- Modify: `.env.example`

- [ ] **Step 1: Update .env.example**

```bash
# Application
NODE_ENV=development

# Database (PostgreSQL via Docker Compose, port 5434)
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/production_template

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_your_secret_key
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Next.js public env vars (must be prefixed NEXT_PUBLIC_)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
NEXT_PUBLIC_API_URL=http://localhost:3001

# Server
PORT=3001
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Turborepo Remote Cache (optional, leave blank for local-only cache)
# TURBO_TOKEN=your_vercel_token
# TURBO_TEAM=your_vercel_team
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore(env): update .env.example for Next.js 15 and Turborepo"
```

---

### Task 16: Update CI/CD workflow

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Rewrite .github/workflows/ci.yml**

Key changes vs current:

- Single `pnpm install` step shared via workflow-level cache (no duplicate install per job)
- All jobs use `turbo run` instead of `pnpm -r`
- E2E job gated to PRs targeting `main` only
- `@repo/api` (not `@repo/server`) for db:generate

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run type-check

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: production_template_test
        ports:
          - 5434:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm turbo run test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5434/production_template_test
          CLERK_SECRET_KEY: sk_test_ci
          CLERK_PUBLISHABLE_KEY: pk_test_ci
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_ci
          NODE_ENV: test

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: pnpm test:e2e
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_ci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_ci
          NEXT_PUBLIC_API_URL: http://localhost:3001
          CLERK_SECRET_KEY: sk_test_ci

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high
        continue-on-error: true
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: update workflow to use turbo run, gate e2e to PRs targeting main"
```

---

### Task 17: Update Claude Code hooks

**Files:**

- Modify: `.claude/settings.json`

- [ ] **Step 1: Read current .claude/settings.json**

```bash
cat .claude/settings.json
```

- [ ] **Step 2: Add PostToolUse hooks for type-check**

Merge the following hooks into `.claude/settings.json`. If the file has no `hooks` key, add it. If it does, merge the `PostToolUse` array.

The hook uses a portable Node.js one-liner (no `grep -P` or bash-specific tools — works on Windows Git Bash, macOS, and Linux):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node -e \"const f=process.env.CLAUDE_TOOL_INPUT_FILE_PATH||''; const m=f.match(/(apps|packages)\\/[^\\/]+/); if(m){const p=m[0]; try{const n=require('./'+p+'/package.json').name; require('child_process').execSync('pnpm --filter '+n+' type-check',{stdio:'inherit'})}catch(e){}}\" 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

> **Note:** The hook command is intentionally best-effort (`|| true`) to avoid blocking Claude when working outside a package (e.g., editing root config files). Errors appear in the tool output but do not fail the tool call.

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "chore(claude): add post-edit type-check hook"
```

---

### Task 18: Delete packages/client and packages/server, run final verification

**Files:**

- Delete: `packages/client/` (entire directory)
- Delete: `packages/server/` (entire directory)

- [ ] **Step 1: Verify apps/api tests pass before deleting packages/server**

```bash
pnpm --filter @repo/api test
```

Expected: PASS

- [ ] **Step 2: Verify apps/web type-check passes before deleting packages/client**

```bash
pnpm --filter @repo/web type-check
```

Expected: PASS

- [ ] **Step 3: Delete packages/client and packages/server**

```bash
rm -rf packages/client packages/server
```

- [ ] **Step 4: Reinstall to clean up orphaned workspace symlinks**

```bash
pnpm install
```

Expected: No errors. `packages/client` and `packages/server` no longer appear.

- [ ] **Step 5: Run full turbo build (dry run first)**

```bash
pnpm turbo run build --dry
```

Expected: Graph shows `@repo/shared` → `@repo/ui` → `@repo/web`, and `@repo/shared` → `@repo/api`. No reference to old packages.

- [ ] **Step 6: Run full type-check across all packages**

```bash
pnpm type-check
```

Expected: All packages pass. Output shows `@repo/shared`, `@repo/ui`, `@repo/api`, `@repo/web`, `@repo/eslint-config`.

- [ ] **Step 7: Run full test suite**

```bash
pnpm test
```

Expected: `@repo/api` tests pass. `@repo/shared` echoes no tests. `@repo/web` vitest runs (may have 0 tests at this stage — that's OK).

- [ ] **Step 8: Commit deletion of old packages**

```bash
git add -A
git commit -m "chore(cleanup): remove packages/client and packages/server after migration"
```

---

### Task 19: Update docker-compose.yml container name

**Files:**

- Modify: `docker-compose.yml`

- [ ] **Step 1: Update container_name in docker-compose.yml**

Change `container_name: repo-postgres` to `container_name: production-template-postgres`.

- [ ] **Step 2: Verify docker-compose config is valid**

```bash
docker compose config
```

Expected: Valid YAML output showing updated container name.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore(docker): rename postgres container to production-template-postgres"
```

---

### Task 20: Smoke test — start dev server

**Purpose:** Verify the full development stack starts without errors before marking the migration complete.

- [ ] **Step 1: Start PostgreSQL**

```bash
pnpm docker:up
```

Expected: `production-template-postgres` container starts healthy.

- [ ] **Step 2: Run database migration**

```bash
pnpm db:generate
pnpm db:migrate
```

Expected: Prisma client generated for `@repo/api`. Migration runs successfully.

- [ ] **Step 3: Start all dev servers**

```bash
pnpm dev
```

Expected:

- `apps/api` starts on port 3001 (`Server started`)
- `apps/web` starts on port 3000 (Next.js dev server ready)

- [ ] **Step 4: Verify home page loads**

Navigate to `http://localhost:3000` — should see the Production Template home page with feature cards.

- [ ] **Step 5: Verify API health endpoint**

```bash
curl http://localhost:3001/api/health
```

Expected:

```json
{ "success": true, "data": { "status": "ok" } }
```

- [ ] **Step 6: Verify API proxy works through Next.js**

```bash
curl http://localhost:3000/api/health
```

Expected: Same JSON response (proxied through Next.js rewrite to Express).

- [ ] **Step 7: Final commit**

Ensure all prior tasks are committed (`git status` shows a clean tree) before running:

```bash
git add -A
git commit -m "chore(migration): complete turborepo + next.js 15 migration"
```

Expected: Clean working tree. All CI jobs green: lint ✅, type-check ✅, test ✅, build ✅, security ✅. Dev server starts cleanly on ports 3000 (Next.js) and 3001 (Express).
