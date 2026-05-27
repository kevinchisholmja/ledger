# Code Style Rules

## Comments
Default: write no comments. Add one only when the **WHY** is non-obvious: a hidden
constraint, a subtle invariant, a workaround for a specific bug, or behaviour that
would surprise a reader. Never comment what the code does — well-named identifiers
already do that. Never write multi-paragraph docstrings or multi-line comment blocks.
Never reference the current task, fix, or PR number in code comments.

## Scope discipline
Do not add features, refactor, or introduce abstractions beyond what the task requires.
A bug fix does not need surrounding cleanup. A one-shot operation does not need a helper.
Three similar lines is better than a premature abstraction. No half-finished
implementations. No backwards-compatibility shims for code you are replacing.

## TypeScript
- Strict types throughout — no implicit `any`, no explicit `any` unless unavoidable
- Prefer `type` over `interface` for data shapes; use `interface` only for extension
- Infer types from Drizzle schema: `typeof table.$inferSelect` — do not duplicate
- No `as unknown as X` casts — fix the type properly

## Naming
- Files: `kebab-case.ts` for libraries, `PascalCase.tsx` for React components
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- DB columns: `snake_case` (Drizzle maps to camelCase in TS via field names)
- React components: `PascalCase`
- Hooks: `useXxx`

## File structure
- One default export per component file
- Named exports for utilities, types, constants
- No barrel `index.ts` files — import from the specific file

## Error handling
- Only validate at system boundaries (user input, external APIs, Telegram messages)
- Do not add error handling, fallbacks, or validation for scenarios that cannot happen
- Trust internal code and framework guarantees
- Use early returns, not nested if-else chains

## No dead code
If something is unused, delete it. Don't comment it out. Don't rename it `_old`.
Git history is the backup.
