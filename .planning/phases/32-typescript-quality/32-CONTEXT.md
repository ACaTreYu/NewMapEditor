# Phase 32: TypeScript Quality - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate all TypeScript errors across the entire codebase (src/ and electron/) with strict mode enabled. Phase ends with `npm run typecheck` producing zero errors and `"strict": true` in tsconfig. This is a code quality phase — no new features, no UI changes, no behavioral changes.

</domain>

<decisions>
## Implementation Decisions

### Strictness level
- Incremental approach: fix existing errors first, then enable strict mode options
- End state: `"strict": true` in tsconfig with zero errors
- Claude chooses which strict options to enable and in what order based on codebase assessment
- Even if strict mode surfaces 100+ new errors, push through and fix them all — this is the final phase

### Error resolution strategy
- Claude's discretion on `any` types — proper types where practical, `any` only when truly unavoidable
- Claude's discretion on binary I/O typing (MapParser) — type assertions OK where full typing would be overly complex
- Claude's discretion on `@ts-expect-error` — determine if any cases genuinely warrant suppression vs proper fixing
- Claude's discretion on explicit return types — add where they improve clarity or fix errors, skip trivial cases

### Type coverage scope
- Fix EVERYTHING — all TypeScript errors across the entire codebase, not just the 3 named files
- Include Electron main process files (electron/ directory) — full coverage
- Claude's discretion on shared type definition files — consolidate where it reduces duplication, keep in-place where locality matters
- Claude's discretion on @types packages vs local declarations — use whatever approach is most practical

### Breaking change tolerance
- Claude's discretion on function signature changes — refactor where it improves type safety, preserve where cascading changes are excessive
- Claude's discretion on file splitting — only if it genuinely resolves type issues that can't be fixed otherwise
- Claude's discretion on runtime null guards — add only where null actually could occur, not just to satisfy the compiler
- Claude's discretion on Zustand store type tightening — tighten where it catches real bugs, keep loose where flexibility is intentional

### Claude's Discretion
- Order of strict option enablement
- Whether to use `any`, type assertions, or `@ts-expect-error` on a case-by-case basis
- Return type annotation coverage
- Type file organization (shared vs in-place)
- Dependency additions (@types packages)
- Signature refactoring vs preservation decisions
- Runtime guard additions for null safety
- Zustand store type precision

</decisions>

<specifics>
## Specific Ideas

- User wants the gold standard: `strict: true` + zero errors — no compromises
- All files in scope, including Electron main process
- This is the FINAL phase — whatever it takes to get to clean typecheck

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 32-typescript-quality*
*Context gathered: 2026-02-09*
