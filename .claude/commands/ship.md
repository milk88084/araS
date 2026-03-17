# /ship — Senior Developer Workflow

Automate the full delivery pipeline: lint → stage → commit → push, with safety guardrails at every step.

## Step 1: Pre-flight Validation

Run the project linter first. Do not proceed if linting fails.

```bash
pnpm lint
```

If the command exits with a non-zero code, stop immediately and display the full error output with this message:

> **Lint failed. Aborting ship workflow.**
> Fix the errors above, then run `/ship` again.

## Step 2: Branch Protection

Detect the current branch:

```bash
git branch --show-current
```

If the branch is `main` or `master`:

1. Warn the user in bold: **"⚠ You are about to push directly to `<branch>` (production)."**
2. Ask for explicit confirmation: _"Type YES to confirm you intend to push to `<branch>` directly, or anything else to abort."_
3. If the response is not exactly `YES`, abort with: _"Aborted. Switch to a feature branch and try again."_

## Step 3: Smart Staging

### 3a — Untracked files

Run:

```bash
git status --porcelain
```

List any untracked files (lines beginning with `??`). If found, ask:

> The following untracked files were found:
> `<list>`
> Include them in this commit? (y/N)

Add them with `git add <file>` only if the user confirms with `y` or `yes`.

### 3b — Sensitive file guard

After any staging action, inspect the index for sensitive filenames:

```bash
git diff --cached --name-only
```

If any of the following patterns appear in staged files, **immediately unstage them** with `git restore --staged <file>` and warn the user:

- `.env`, `.env.*` (any `.env` variant)
- Files containing `secret`, `key`, `token`, `credential`, `password` in the name (case-insensitive)
- `*.pem`, `*.p12`, `*.pfx`, `*.key`

Display:

> **Sensitive file(s) removed from staging:**
> `<list of removed files>`
> These will not be committed. Add them to `.gitignore` if intentional.

## Step 4: AI-Powered Semantic Commit

### 4a — Analyze the diff

```bash
git diff --cached
```

Also capture the list of staged files:

```bash
git diff --cached --name-only
```

### 4b — Generate the commit message

Analyse the diff and produce a **Conventional Commits** message using this format:

```
<type>(<scope>): <short imperative summary, max 72 chars>

- <what changed and why, bullet 1>
- <what changed and why, bullet 2>
...
```

**Type selection rules:**

| Condition                         | Type               |
| --------------------------------- | ------------------ |
| New feature or behaviour          | `feat`             |
| Bug fix                           | `fix`              |
| Refactor without behaviour change | `refactor`         |
| Tests only                        | `test`             |
| Build/tooling/config              | `build` or `chore` |
| Documentation                     | `docs`             |
| Performance improvement           | `perf`             |
| Style/formatting only             | `style`            |
| CI pipeline                       | `ci`               |
| Reverts a prior commit            | `revert`           |

**Scope**: derive from the primary directory or package changed (e.g., `api`, `ui`, `auth`, `db`, `config`). Omit if changes span the whole repo.

**Subject line**: lowercase, imperative mood, no trailing period.

**Body**: 2–5 concise bullets. Each bullet explains _what_ changed and _why_ (motivation or impact). Do not repeat the subject line.

Present the generated message to the user and ask:

> Use this commit message? (Y/n/edit)

- `Y` or Enter → proceed with the message as-is.
- `n` → abort with: _"Commit aborted. Stage your changes and run `/ship` again when ready."_
- `edit` → open the message for inline editing in the conversation before committing.

### 4c — Commit

```bash
git commit -m "$(cat <<'EOF'
<generated message>
EOF
)"
```

If `git commit` fails (e.g., pre-commit hook rejection), display the hook output and abort:

> **Commit hook failed. Aborting.**
> Resolve the issues above, then run `/ship` again.

Do **not** use `--no-verify` under any circumstances.

## Step 5: Push

Capture the current branch name, then push:

```bash
git push origin <current_branch>
```

If push fails, display the git error and stop. Do not force-push. Suggest:

> Push failed. If the remote has diverged, run `git pull --rebase origin <branch>` to reconcile, then `/ship` again.

## Step 6: Success Summary

On successful push, display a formatted summary:

```
╔══════════════════════════════════════════════════╗
║  Shipped successfully                            ║
╠══════════════════════════════════════════════════╣
║  Branch : <branch>                               ║
║  Commit : <short hash>  <subject line>           ║
║  Remote : origin/<branch>                        ║
╚══════════════════════════════════════════════════╝
```

Retrieve the short hash with:

```bash
git rev-parse --short HEAD
```

---

## Abort Conditions Summary

| Trigger                             | Action                               |
| ----------------------------------- | ------------------------------------ |
| Lint fails                          | Show errors, stop                    |
| Main/master branch, no confirmation | Stop                                 |
| User declines commit message        | Stop                                 |
| Pre-commit hook rejects commit      | Show hook output, stop               |
| Push fails                          | Show git error, suggest rebase, stop |

Never bypass git hooks (`--no-verify`), never force-push, never commit sensitive files.
