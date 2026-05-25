# package.json — Reference

---

## Annotated example

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,

  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",

    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push"
  },

  "dependencies": {
    "next": "16.2.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.4",

    "drizzle-orm": "^0.40.1",
    "postgres": "^3.4.5",

    "@anthropic-ai/sdk": "^0.39.0"
  },

  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",

    "drizzle-kit": "^0.30.4",

    "tailwindcss": "^4",
    "@tailwindcss/typography": "^0.5"
  }
}
```

---

## Script conventions

Scripts that run a CLI tool from devDependencies work because npm automatically
adds `node_modules/.bin/` to PATH when running scripts. So `"drizzle-kit generate"`
in scripts is the same as `npx drizzle-kit generate` from the terminal.

**Naming conventions:**
- `dev` / `build` / `start` / `lint` — standard Next.js scripts
- `typecheck` — manual TypeScript check
- `db:*` — database operations (namespace with `:`)
- `test` / `test:watch` — tests

---

## Version pinning

```json
"next": "16.2.6"        // exact — breaking changes between minor versions
"next": "^16.2.6"       // compatible — allows 16.x.x updates
"next": "~16.2.6"       // patch only — allows 16.2.x updates
"next": "*"             // latest — dangerous
```

**Rule:** Pin exact versions for frameworks (`next`, `react`) and anything with a
known history of breaking changes. Use `^` for utilities and type packages.

---

## engines field

Declare the Node.js version your app requires:
```json
"engines": {
  "node": ">=20.0.0"
}
```

Vercel reads this and uses the correct Node version. Without it, Vercel uses
its default (currently Node 22).

---

## Common operations

```bash
npm install                       # install from package-lock.json (exact versions)
npm install --save-exact <pkg>    # install and pin exact version (no ^ or ~)
npm update <pkg>                  # update a specific package within its range
npm run build && npm run start    # test production build locally
```

---

## package-lock.json

Always commit `package-lock.json`. It locks the exact versions of every dependency
and transitive dependency. Without it, `npm install` on a different machine may
produce a different tree and different bugs.

`npm ci` (vs `npm install`):
- `npm ci` — installs exactly from `package-lock.json`, fails if lock is out of sync
- `npm install` — resolves and potentially updates the lock file

Use `npm ci` in CI/CD.
