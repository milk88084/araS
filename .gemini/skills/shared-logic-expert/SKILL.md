# Skill: Shared Logic Expert

This skill specializes in maintaining the integrity of the `packages/shared` package and ensuring its correct synchronization with `server` and `client`.

## Expertise
- Zod Schema definition and optimization.
- Cross-package type safety (TypeScript).
- Validation logic for API contracts.

## Mandates
1. **Shared First**: Always propose changes to `packages/shared` before modifying `server` controllers or `client` hooks.
2. **Schema Integrity**: Ensure that Zod schemas in `shared` are the "Single Source of Truth".
3. **Validation**: When a schema is updated, immediately check for breakages in:
   - `packages/server/src/controllers`
   - `packages/client/src/lib/api-client.ts`

## Workflows
- **New Feature**: Start by drafting the Zod schema in `packages/shared/src/schemas`.
- **Refactoring**: Use `grep_search` to find all usages of a shared type before renaming or deleting it.
