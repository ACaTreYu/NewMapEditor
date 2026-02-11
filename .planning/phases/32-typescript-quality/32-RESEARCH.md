# Phase 32: TypeScript Quality - Research

**Researched:** 2026-02-09
**Domain:** TypeScript strict mode configuration and error resolution
**Confidence:** HIGH

## Summary

Phase 32 aims to achieve zero TypeScript errors with full strict mode enabled across the entire codebase. The current state shows strict mode is already enabled in tsconfig.json, but with 6 TypeScript errors present. Analysis reveals these are straightforward quality issues: unused imports (TS6133) and an ArrayBuffer type incompatibility (TS2322).

The codebase is well-positioned for strict mode compliance. With strict mode already enabled and only 6 errors present, this phase requires targeted fixes rather than major refactoring. The errors fall into two categories: code quality violations (unused declarations) and a single type assertion issue in binary I/O code. The incremental approach involves fixing existing errors first, then validating that all strict options remain enabled and functioning correctly.

**Primary recommendation:** Fix the 6 existing errors immediately, validate zero-error state with full strict mode, then perform a comprehensive audit of all TypeScript files to ensure no additional errors surface during development.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Incremental approach: fix existing errors first, then enable strict mode options
- End state: `"strict": true` in tsconfig with zero errors
- Claude chooses which strict options to enable and in what order based on codebase assessment
- Even if strict mode surfaces 100+ new errors, push through and fix them all — this is the final phase
- Claude's discretion on `any` types — proper types where practical, `any` only when truly unavoidable
- Claude's discretion on binary I/O typing (MapParser) — type assertions OK where full typing would be overly complex
- Claude's discretion on `@ts-expect-error` — determine if any cases genuinely warrant suppression vs proper fixing
- Claude's discretion on explicit return types — add where they improve clarity or fix errors, skip trivial cases
- Fix EVERYTHING — all TypeScript errors across the entire codebase, not just the 3 named files
- Include Electron main process files (electron/ directory) — full coverage
- Claude's discretion on shared type definition files — consolidate where it reduces duplication, keep in-place where locality matters
- Claude's discretion on @types packages vs local declarations — use whatever approach is most practical
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.7.2 | Type-safe JavaScript superset | Industry standard for typed JavaScript development |
| @types/node | 22.10.0 | Node.js type definitions | Required for Electron main process typing |
| @types/react | 18.3.0 | React type definitions | Required for React component typing |
| @types/react-dom | 18.3.0 | React DOM type definitions | Required for React rendering typing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Electron | 34.0.0 | Desktop app framework | Already in use - provides IPC type definitions |
| Zustand | 5.0.3 | State management | Already in use - excellent TypeScript support out of box |
| React Resizable Panels | 4.5.7 | Resizable panel layout | Already in use - has built-in TypeScript definitions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TypeScript strict mode | Gradual typing (no strict) | Strict mode catches more bugs but requires upfront error fixing |
| Type assertions | Runtime type guards | Assertions are simpler for binary I/O but provide no runtime safety |
| Inline types | Shared type files | Inline is faster to write but creates duplication for common patterns |

**Installation:**
No new packages required - all dependencies already present.

## Architecture Patterns

### Recommended Project Structure
Current structure is already well-organized:
```
src/
├── core/               # Portable logic (no Electron deps)
│   ├── map/           # Map data structures and parsing
│   ├── editor/        # Editor state management (Zustand)
│   └── services/      # Service interfaces (FileService)
├── adapters/          # Platform-specific implementations
│   └── electron/      # Electron FileService adapter
├── components/        # React UI components
├── contexts/          # React contexts (DI for services)
└── App.tsx           # Main application component
electron/
├── main.ts           # Electron main process
└── preload.ts        # IPC bridge with type definitions
```

### Pattern 1: Strict Null Checks with Optional Chaining
**What:** Use optional chaining and nullish coalescing to handle nullable values safely
**When to use:** When strictNullChecks is enabled and values may be null/undefined
**Example:**
```typescript
// Source: TypeScript TSConfig strictNullChecks documentation
const value = map?.tiles[index] ?? DEFAULT_TILE;
const name = result.data?.name || 'Untitled';
```

### Pattern 2: Type Assertions for Binary I/O
**What:** Use type assertions (`as Type`) for buffer operations where TypeScript can't infer types
**When to use:** In MapParser.ts for ArrayBuffer/DataView operations
**Example:**
```typescript
// Source: TypeScript 5.7+ ArrayBuffer handling
const buffer: ArrayBuffer = tiles.buffer as ArrayBuffer;
const view = new DataView(buffer);
```

### Pattern 3: Unused Parameter Prefixing
**What:** Prefix unused parameters with underscore to satisfy noUnusedParameters
**When to use:** When function signature requires parameters for interface compliance but doesn't use them
**Example:**
```typescript
// Source: TypeScript ESLint no-unused-vars rule
function saveMapDialog(_defaultName?: string): Promise<FileDialogResult> {
  // _defaultName signals intentionally unused parameter
}
```

### Pattern 4: Zustand Store Typing
**What:** Use TypeScript inference for Zustand stores with explicit action return types
**When to use:** All Zustand store definitions
**Example:**
```typescript
// Source: Zustand TypeScript documentation
interface EditorState {
  map: MapData | null;  // Explicit null for unloaded state
  setMap: (map: MapData | null, filePath?: string) => void;
}

const useEditorStore = create<EditorState>((set) => ({
  map: null,
  setMap: (map, filePath) => set({ map, filePath })
}));
```

### Anti-Patterns to Avoid
- **Disabling strict checks with @ts-ignore:** Use @ts-expect-error only when truly necessary and document why
- **Overly permissive any types:** Use unknown or specific union types instead
- **Missing return type annotations on public APIs:** Add explicit return types for exported functions
- **Type assertions without reason:** Document why assertions are needed (e.g., "Buffer type narrowing for IPC")

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unused variable detection | Manual code review | noUnusedLocals + noUnusedParameters | Compiler catches them automatically during typecheck |
| Null safety | Runtime null checks everywhere | strictNullChecks + optional chaining | Type system proves safety at compile time |
| Type narrowing | Manual type guards | Control flow analysis | TypeScript 5.7+ narrows types automatically in if/switch |
| ArrayBuffer typing | Custom buffer wrappers | Type assertions with comments | Binary I/O typing is inherently unsafe - assertions are standard |

**Key insight:** TypeScript's strict mode options leverage compiler analysis to catch bugs at build time rather than runtime. Resist the urge to add runtime checks just to satisfy the type checker - if the types prove correctness, runtime guards are unnecessary overhead.

## Common Pitfalls

### Pitfall 1: Unused Imports/Variables (TS6133)
**What goes wrong:** TypeScript reports TS6133 errors for declared variables whose values are never read, even if they're imported
**Why it happens:** noUnusedLocals and noUnusedParameters are enabled (which is correct for strict mode)
**How to avoid:**
- Remove genuinely unused imports/variables
- Prefix intentionally unused parameters with underscore (e.g., `_defaultName`)
- For imported constants used only in types, use `import type { ... }`
**Warning signs:** Multiple TS6133 errors in MapParser.ts, WallSystem.ts - likely dead code from refactoring

### Pitfall 2: ArrayBuffer vs ArrayBufferLike (TS2322)
**What goes wrong:** `Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'` because SharedArrayBuffer diverges from ArrayBuffer in ES2024+
**Why it happens:** TypedArray.buffer returns ArrayBufferLike (union of ArrayBuffer | SharedArrayBuffer) in TypeScript 5.7+
**How to avoid:**
- Use explicit type assertions: `tiles.buffer as ArrayBuffer`
- Document the assertion with a comment explaining why it's safe
- For new code, prefer explicit ArrayBuffer types rather than relying on inference
**Warning signs:** Error at MapParser.ts:299 - `return map.tiles.buffer;` needs type assertion

### Pitfall 3: Strict Mode Already Enabled but Errors Ignored
**What goes wrong:** Developers assume strict mode is off because errors exist, but it's actually enabled
**Why it happens:** TypeScript allows code with errors to run in development (only fails on `npm run typecheck`)
**How to avoid:**
- Run `npm run typecheck` in CI to block merges with type errors
- Configure editor to show TypeScript errors inline
- Fix errors immediately rather than accumulating technical debt
**Warning signs:** Phase 32 exists because strict mode is enabled but 6 errors are present

### Pitfall 4: Over-Engineering Fixes for Simple Problems
**What goes wrong:** Adding complex type guards, splitting files, or creating abstraction layers when a simple fix would work
**Why it happens:** Treating type errors as deep architectural problems rather than surface-level fixes
**How to avoid:**
- Start with simplest fix (remove unused variable, add type assertion)
- Only refactor if the simple fix reveals deeper design issues
- Preserve existing architecture unless types expose real bugs
**Warning signs:** Temptation to refactor MapParser entirely instead of just fixing 4 unused imports

## Code Examples

Verified patterns from official sources and current codebase:

### Fixing Unused Imports (TS6133)
```typescript
// BEFORE (TS6133 error)
import { MAP_WIDTH, MAP_HEIGHT, createEmptyMap } from './types';

// AFTER (remove unused imports)
import { TILE_COUNT } from './types';
// Only import what you actually use
```

### Fixing Unused Parameters
```typescript
// BEFORE (TS6133 error)
private updateNeighbor(map: MapData, x: number, y: number, addConnection: number): void {
  // addConnection is declared but never read
  const connections = this.getConnections(map, x, y);
}

// AFTER (prefix with underscore)
private updateNeighbor(map: MapData, x: number, y: number, _addConnection: number): void {
  // Underscore signals intentionally unused parameter
  const connections = this.getConnections(map, x, y);
}
```

### Fixing ArrayBuffer Type Assertion
```typescript
// BEFORE (TS2322 error)
getTileBuffer(map: MapData): ArrayBuffer {
  return map.tiles.buffer; // Type 'ArrayBufferLike' is not assignable to 'ArrayBuffer'
}

// AFTER (explicit type assertion with comment)
getTileBuffer(map: MapData): ArrayBuffer {
  // Uint16Array.buffer is always ArrayBuffer in browser/Electron (not SharedArrayBuffer)
  // Type assertion is safe because we never use SharedArrayBuffer
  return map.tiles.buffer as ArrayBuffer;
}
```

### TypeScript Strict Mode Configuration
```json
// Source: Official TypeScript TSConfig documentation
{
  "compilerOptions": {
    "strict": true,  // Enables all strict type-checking options
    "noUnusedLocals": true,  // Report errors on unused local variables
    "noUnusedParameters": true,  // Report errors on unused parameters
    "noFallthroughCasesInSwitch": true  // Report errors for fallthrough cases
  }
}
```

### Zustand Store with Strict Typing
```typescript
// Current codebase pattern - already follows best practices
interface EditorState {
  map: MapData | null;  // Explicit null for unloaded state
  setMap: (map: MapData | null, filePath?: string) => void;
  // Action signatures with explicit parameters and return types
}

const useEditorStore = create<EditorState>((set) => ({
  map: null,
  setMap: (map, filePath) => set({ map, filePath: filePath ?? null })
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gradual typing (strict: false) | Full strict mode from start | TypeScript 3.0+ (2018) | Catch more bugs at compile time, easier to maintain |
| Permissive TypedArray typing | ArrayBufferLike union type | TypeScript 5.7 (2024) | More accurate but requires assertions for buffer access |
| Manual ESLint unused checks | Built-in noUnusedLocals | TypeScript 2.0+ (2016) | Faster feedback, no extra tooling needed |
| any for IPC boundaries | Explicit interface definitions | Modern practice (2020+) | Type-safe IPC with zero runtime overhead |

**Deprecated/outdated:**
- `@ts-ignore`: Use `@ts-expect-error` instead - it errors if the suppression is no longer needed
- Prefixing types with `I` (e.g., `IMapData`): Modern TypeScript uses plain names
- Separate .d.ts files for simple types: Collocate types with implementation unless shared widely

## Open Questions

1. **Should we add explicit return types to all public functions?**
   - What we know: User gave discretion - "add where they improve clarity or fix errors, skip trivial cases"
   - What's unclear: Definition of "trivial" vs worth annotating
   - Recommendation: Add return types to exported functions in core/ (public API), skip internal helpers

2. **How aggressive should we be with stricter-than-strict options?**
   - What we know: Current config already has noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch
   - What's unclear: Whether to add noUncheckedIndexedAccess, exactOptionalPropertyTypes
   - Recommendation: Keep current strictness level - already strict enough, additional flags would require significant refactoring for marginal benefit

3. **Should we consolidate types into shared definition files?**
   - What we know: User gave discretion - "consolidate where it reduces duplication, keep in-place where locality matters"
   - What's unclear: Current organization seems reasonable - what would qualify for consolidation?
   - Recommendation: Keep current structure. types.ts already consolidates core types, component-specific types stay local

## Sources

### Primary (HIGH confidence)
- [TypeScript TSConfig Option: strict](https://www.typescriptlang.org/tsconfig/strict.html) - Strict mode options
- [TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig/) - Complete configuration reference
- [TypeScript TSConfig Option: noUnusedLocals](https://www.typescriptlang.org/tsconfig/noUnusedLocals.html) - TS6133 error documentation
- [TypeScript TSConfig Option: strictNullChecks](https://www.typescriptlang.org/tsconfig/strictNullChecks.html) - Null safety documentation
- [TypeScript Documentation - TypeScript 5.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html) - ArrayBufferLike changes
- [TypeScript Documentation - TypeScript 5.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) - TypedArray generic changes

### Secondary (MEDIUM confidence)
- [How to Configure TypeScript Strict Mode](https://oneuptime.com/blog/post/2026-01-24-typescript-strict-mode/view) - 2026 best practices guide
- [How to Incrementally Migrate an Angular Project to TypeScript Strict Mode](https://www.bitovi.com/blog/how-to-incrementally-migrate-an-angular-project-to-typescript-strict-mode) - Migration strategies
- [TypeScript Best Practices for Large-Scale Web Applications in 2026](https://johal.in/typescript-best-practices-for-large-scale-web-applications-in-2026/) - Modern patterns
- [How to Set Up Strict TypeScript Configuration for React Projects](https://oneuptime.com/blog/post/2026-01-15-strict-typescript-configuration-react/view) - React-specific guidance
- [AllowSharedBufferSource definition is incorrect · Issue #61480 · microsoft/TypeScript](https://github.com/microsoft/TypeScript/issues/61480) - ArrayBufferLike type discussion
- [ArrayBuffer is returned as ArrayBufferLike which causes issues · Issue #9364 · oven-sh/bun](https://github.com/oven-sh/bun/issues/9364) - Workaround patterns

### Tertiary (LOW confidence)
- Community blog posts on strict mode adoption (various sources - verified against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed, versions verified in package.json
- Architecture: HIGH - Current structure analyzed directly, follows portable pattern from v1.7
- Pitfalls: HIGH - All 6 errors reproduced locally via `npm run typecheck`, solutions verified against official TypeScript documentation
- Migration strategy: MEDIUM - Based on community best practices, validated against official docs but not specific to this codebase

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - TypeScript stable, strict mode patterns mature)
