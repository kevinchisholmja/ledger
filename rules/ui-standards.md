# UI & Styling Standards

## Colours (do not deviate)
| Role | Class | Hex |
|------|-------|-----|
| Primary accent | `blue-600` | #2563EB |
| Sidebar background | `bg-[#1B1F3B]` | Dark navy |
| Page background | `bg-gray-50` | — |
| Card background | `bg-white` | — |
| Debit amount | `text-gray-900` | — |
| Credit amount | `text-emerald-600` | — |
| Negative balance | `text-red-600` | — |
| Pending badge | `bg-blue-500` | — |

**No `indigo-*` anywhere in the codebase.** Use `blue-*` only.

## Tailwind version
Tailwind v4. Import syntax:
```css
@import "tailwindcss";
```
NOT `@tailwind base/components/utilities`. Do not use the v3 `theme()` function
or `@apply` with v3-style utilities.

## Card component pattern
```tsx
<div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
```

## Sidebar pattern
```tsx
<aside className="hidden md:flex w-56 flex-col fixed inset-y-0 left-0 bg-[#1B1F3B] z-20">
```
Every page replicates the full sidebar (no shared layout component for now).
Active item: `bg-white/15 text-white font-medium`.
Inactive item: `text-slate-400 hover:text-white hover:bg-white/10`.

## Currency formatting (non-negotiable)
Always use `formatJMD()` or `formatCurrency()` from `lib/format.ts`.
Never inline `Intl.NumberFormat`, `J$${amount}`, or `$${amount}`.

```typescript
import { formatCurrency, formatJMD } from "@/lib/format";
formatCurrency(amount, "JMD")   // preferred for multi-currency
formatJMD(amount)               // shorthand for JMD-only displays
```

## Form fields for Budget and Category
Always `<select>` populated from the DB — never a free-text `<input>`.
```tsx
<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
  <option value="">— Select category —</option>
  {categories.map((c) => (
    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
  ))}
</select>
```

## Safe area insets (mobile)
Apply via inline `style` — not Tailwind class (v4 has no built-in safe-area utilities):
```tsx
style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
```

## Numbers
Always use `tabular-nums` for financial amounts so columns align:
```tsx
<span className="font-semibold tabular-nums text-gray-900">
```

## Mobile nav visibility
Mobile bottom nav (`MobileNav`) and upload FAB (`UploadButton`) both live in the
root layout. Both guard against `/login` with:
```tsx
if (pathname === "/login") return null;
```

## z-index stack (do not break)
| Layer | z-index |
|-------|---------|
| Upload FAB | 30 |
| Mobile nav backdrop | 48 |
| Mobile nav drawer | 49 |
| Mobile tab bar | 50 |
| Desktop sidebar | 20 |
| Sticky page headers | 10 |
