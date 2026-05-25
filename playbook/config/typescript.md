# TypeScript — Config Reference

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",               // JS output version
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,                  // allow .js files
    "skipLibCheck": true,             // skip type-checking in node_modules
    "strict": true,                   // enable all strict checks (recommended)
    "noEmit": true,                   // don't output files (Next.js handles this)
    "esModuleInterop": true,          // allow default imports from CommonJS modules
    "module": "esnext",
    "moduleResolution": "bundler",    // modern resolution (Next.js 13+)
    "resolveJsonModule": true,        // import .json files
    "isolatedModules": true,          // required for Babel/SWC compatibility
    "jsx": "preserve",                // let Next.js handle JSX

    // Path aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]                  // @/lib/db → ./lib/db
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`strict: true` enables:**
- `strictNullChecks` — `undefined` and `null` are separate types
- `strictFunctionTypes` — stricter function type checking
- `noImplicitAny` — variables must have explicit types if they can't be inferred

---

## Type checking without building

```bash
npx tsc --noEmit          # type-check everything, produce no output
npx tsc --noEmit --watch  # watch mode
```

Add to package.json:
```json
"scripts": {
  "typecheck": "tsc --noEmit"
}
```

---

## Common patterns

**Optional chaining and nullish coalescing:**
```typescript
const name = user?.profile?.name ?? "Anonymous";
const count = data?.length ?? 0;
```

**Type narrowing:**
```typescript
function handle(value: string | null) {
  if (value === null) return;      // TypeScript knows value is string below
  console.log(value.toUpperCase());
}
```

**Type assertions (use sparingly):**
```typescript
const el = document.getElementById("app") as HTMLDivElement;
const value = someUnknown as string;   // only when you're certain
```

**Non-null assertion (use even more sparingly):**
```typescript
const el = document.getElementById("app")!;  // you assert it's not null
```

**Inferred types from Drizzle/Zod/Prisma:**
```typescript
// Let the library generate the types — don't duplicate them
import type { Expense } from "@/lib/db/schema";   // from Drizzle $inferSelect
```

---

## Utility types

```typescript
Partial<T>         // all properties optional
Required<T>        // all properties required
Pick<T, "a"|"b">   // only properties a and b
Omit<T, "a"|"b">   // everything except a and b
Record<K, V>       // object with keys K and values V
Readonly<T>        // all properties readonly
NonNullable<T>     // removes null and undefined from T
ReturnType<F>      // return type of a function
Awaited<T>         // unwrap Promise<T> to T
```

---

## Common errors

**`Property 'x' does not exist on type 'Y'`**
The type doesn't have that property. Check the type definition or cast.

**`Type 'string | null' is not assignable to type 'string'`**
The value can be null. Either handle the null case or use `!` if you're certain.

**`Object is possibly 'undefined'`**
Access via optional chaining (`?.`) or guard with `if (x !== undefined)`.

**`Argument of type 'X' is not assignable to parameter of type 'Y'`**
Type mismatch. Check what the function expects vs what you're passing.

**`Cannot find module '@/...' or its type declarations`**
Path alias not configured. Check `tsconfig.json` paths and restart TS server.
In VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server".
