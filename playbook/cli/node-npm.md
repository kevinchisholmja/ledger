# Node.js · npm · npx

---

## npm — package management

```bash
npm install                       # install all dependencies from package.json
npm install <package>             # install and add to dependencies
npm install -D <package>          # install and add to devDependencies
npm install -g <package>          # install globally (CLI tools)
npm uninstall <package>           # remove a package
npm update                        # update packages within version ranges
npm outdated                      # list packages with newer versions available
npm audit                         # check for security vulnerabilities
npm audit fix                     # auto-fix vulnerabilities
```

---

## npm — running scripts

```bash
npm run dev                       # start dev server (defined in package.json scripts)
npm run build                     # production build
npm run start                     # start production server
npm run lint                      # run linter
npm run typecheck                 # run TypeScript type checker
npm test                          # run tests
npm run <script>                  # run any script from package.json
```

---

## npx — run without installing

```bash
npx <package>                     # run a package without installing globally
npx <package>@latest              # always use the latest version
npx <package>@1.2.3               # use a specific version
```

Common one-offs:
```bash
npx create-next-app@latest        # scaffold a Next.js project
npx drizzle-kit studio            # open Drizzle visual browser
npx drizzle-kit generate          # generate migrations
npx shadcn@latest add button      # add a shadcn component
npx prisma studio                 # open Prisma Studio (if using Prisma)
```

---

## Node.js — running scripts directly

```bash
node script.js                    # run a JS file
node -e "console.log('hello')"   # run inline JS
node --env-file=.env.local script.js  # load env file (Node 20.6+)
```

For TypeScript files, use `tsx`:
```bash
npx tsx script.ts                 # run a TS file directly (no compile step)
```

---

## Version management

```bash
node -v                           # current Node version
npm -v                            # current npm version
nvm list                          # list installed Node versions (if using nvm)
nvm use 20                        # switch to Node 20
nvm install 22                    # install Node 22
```

---

## package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## Common patterns

**Run a quick DB query to test a connection:**
```bash
node -e "
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
sql\`SELECT 1 as ok\`.then(r => { console.log(r); sql.end(); });
"
```

**Check what version of a package is installed:**
```bash
npm list <package>
npm list --depth=0                # all top-level installed packages
```

**Clear npm cache (when installs behave strangely):**
```bash
npm cache clean --force
rm -rf node_modules
npm install
```
