# Gemini AI Development Standards (GEMINI.md)

This document defines the AI development standards for the `next-production-template` project. Gemini MUST prioritize these rules before executing any instructions.

---

## 1. Project Architecture & Tech Stack
This project follows a **Pnpm Monorepo** architecture, divided into three primary packages:

- **`packages/shared`**: Core domain models, Zod validation schemas, and common types.
- **`packages/server`**: Node.js (Express) backend using Prisma ORM and PostgreSQL.
- **`packages/client`**: Vite + React + TailwindCSS frontend.

### Core Principles:
1. **Schema-Driven Development**: All data models MUST be defined as Zod schemas in `shared` first, then imported by `server` and `client`.
2. **Type Safety**: The use of `any` is strictly prohibited. Strive for end-to-end type safety.
3. **Layered Architecture**: The server follows a `Controller -> Service -> Model (Prisma)` pattern.

---

## 2. Coding Standards

### General Rules
- **Language**: Explanations and responses should be in **Traditional Chinese** (as per user preference), but code comments, variable naming, and commit messages MUST be in **English**.
- **Prettier**: Strictly adhere to the `.prettierrc` configuration in the project root.
- **Validation**: All API request/response bodies MUST be validated using Zod schemas from `shared`.

### Backend (Server)
- **Error Handling**: Use the built-in `errorHandler` middleware. Never throw unformatted errors directly in controllers.
- **Encapsulation**: API responses MUST follow the project's defined `envelope` structure.
- **Dependency Injection**: Keep services pure; database operations should be centralized within the service layer.

### Frontend (Client)
- **Componentization**: Prioritize using base components from `packages/client/src/components/ui`.
- **Styling**: Exclusively use TailwindCSS. Avoid custom CSS files or inline styles.
- **API Calls**: Encapsulate all calls within `packages/client/src/lib/api-client.ts`. Do not use raw `fetch` directly in components.

---

## 3. Testing Standards
- **Unit Testing**: Use Vitest. Any new service or logic change MUST include corresponding tests.
- **E2E Testing**: Use Playwright. Significant feature changes require updates to `tests/e2e`.
- **Verification**: Always run `pnpm test` or relevant lint checks after making modifications.

---

## 4. Git Workflow
- **Branching Strategy**: All active development MUST occur on the `dev` branch.
- **Main Protection**: The `main` branch is for stable production code only.
- **Merging**: After pushing changes to `dev`, Gemini MUST explicitly ask the user for confirmation before attempting to merge `dev` into `main`.
- **Pruning**: Periodically run `git fetch --prune` to keep the local branch list clean.

---

## 5. Commit Standards
- **Language**: All commit messages MUST be in **English**.
- **Format**: Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
  - `feat`: A new feature.
  - `fix`: A bug fix.
  - `docs`: Documentation changes.
  - `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.).
  - `refactor`: A code change that neither fixes a bug nor adds a feature.
  - `perf`: A code change that improves performance.
  - `test`: Adding missing tests or correcting existing tests.
  - `chore`: Changes to the build process or auxiliary tools and libraries.
- **Scope**: Always include a scope in parentheses (e.g., `feat(client): ...`, `fix(server): ...`, `chore(shared): ...`).
- **Brevity**: Keep the subject line under 72 characters.
- **Atomic Commits**: Each commit should represent a single logical change. Gemini should draft the message before committing.

---

## 6. Prompt Templates

### A. Adding a New API Feature
> "I want to add a new feature to [Package Name]: [Description]. Please follow these steps:
> 1. Define the Zod schema in `shared`.
> 2. Implement the Service and Controller in `server`.
> 3. Implement the corresponding unit tests.
> 4. Finally, update the API client in `client`."

### B. Bug Fixing
> "There is a bug in [Feature]: [Error Description]. Please start by creating a reproduction test case in the `tests` directory, then apply the fix and ensure the test passes."

---

## 5. AI Behavioral Guidelines
- **Surgical Updates**: When modifying code, only change what is necessary. Do not alter unrelated formatting or logic.
- **Proactive Validation**: After making changes, proactively check for ESLint or TypeScript type errors.
- **Context Awareness**: When modifying one side of the stack, always check if the `shared` package requires a synchronized update.
- **Security**: Never expose `.env` contents, secrets, or API keys.
