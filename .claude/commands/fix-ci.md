# /fix-ci — Auto-Debug CI Failures

Automatically diagnose and fix the latest failing GitHub Actions CI run for this repository.

## Step 1: Check Latest CI Run

Use the Playwright MCP browser tools to navigate to the GitHub Actions page:

```
https://github.com/milk88084/next-production-template/actions
```

Take a screenshot to see the current state. Then use `browser_evaluate` to extract the URL of the most recent failed run:

```js
() => {
  const links = Array.from(document.querySelectorAll('a[href*="/actions/runs/"]'));
  return links.slice(0, 5).map((a) => ({ text: a.innerText.trim().slice(0, 80), href: a.href }));
};
```

If the most recent run is not a failure (green), report:

> **CI is passing — no action needed.**
> Latest run: `<run name>` ✅

Otherwise, navigate to the failed run URL.

## Step 2: Read the Failure Summary

On the run page, use `browser_evaluate` to extract the annotations (errors and warnings):

```js
() => {
  const rows = Array.from(document.querySelectorAll("table tr"));
  return rows.map((r) => r.innerText.trim().slice(0, 300)).filter(Boolean);
};
```

Also identify which jobs failed vs passed from the workflow graph.

## Step 3: Diagnose the Root Cause

Based on the error messages, identify the failing job and the exact error. Common patterns:

| Error pattern                               | Likely cause                                                     |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `missing dependency` / `Cannot find module` | Package not installed or missing devDependency                   |
| `coverage does not meet threshold`          | Coverage too low — separate test from test:coverage              |
| `TypeScript error`                          | Type mismatch in source or test code                             |
| `ESLint error`                              | Lint rule violation                                              |
| `exited (1)` on test step                   | Test failure — need to check test output                         |
| `pnpm audit` exit 1                         | Vulnerable dependency (usually `continue-on-error` handles this) |

If the error is not obvious from the summary, reproduce it locally:

```bash
pnpm turbo run <failing-task>
```

## Step 4: Fix the Issue

Apply the minimal fix needed. Follow project conventions from CLAUDE.md:

- Conventional Commits for commit messages
- `.js` extensions on relative imports in `apps/api` (ESM)
- No `--no-verify` on commits

After fixing, verify locally:

```bash
pnpm turbo run test
pnpm turbo run lint
pnpm turbo run type-check
```

## Step 5: Commit and Push

Stage only the files changed for the fix:

```bash
git add <specific files>
git commit -m "fix(ci): <short description of what was fixed>"
git push
```

## Step 6: Report

After pushing, summarize what was found and fixed:

```
╔══════════════════════════════════════════════════╗
║  CI Fix Applied                                  ║
╠══════════════════════════════════════════════════╣
║  Failing job : <job name>                        ║
║  Root cause  : <one-line description>            ║
║  Fix applied : <what was changed>                ║
║  Commit      : <short hash>                      ║
╚══════════════════════════════════════════════════╝
```

---

## Abort Conditions

| Situation                           | Action                                |
| ----------------------------------- | ------------------------------------- |
| CI is already passing               | Report success, do nothing            |
| Cannot view logs (login required)   | Reproduce error locally instead       |
| Fix requires architectural decision | Stop and ask the user                 |
| Fix would affect more than 3 files  | Stop and ask the user to review first |
