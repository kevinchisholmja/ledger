# Incident Log

| Date | Issue | Root cause | Fix |
|---|---|---|---|
| 2026-05-24 | "Couldn't save that" on all text messages | `amount NOT NULL` violated by manual entries (amount is unknown until review) | Migration 20240004: dropped NOT NULL on expenses.amount |
| 2026-05-24 | PDF receipts silently ignored | Webhook only checked `message.photo`, not `message.document` | Updated webhook to detect document MIME type and route to same OCR flow |
| 2026-06-01 | React error #300 on logout ("Rendered more hooks than previous render") | `UploadButton.tsx` had four `useState` calls after an early `return null`, causing hook count to differ between `/login` and all other routes | Moved all `useState` declarations above the early return in `UploadButton.tsx` |
| 2026-06-01 | React error #418 on logout ("Hydration mismatch") | `ThemeToggle.tsx` rendered `<Moon />` on the server but potentially `<Sun />` on the client after mount, producing a server/client HTML mismatch | Return a placeholder button (empty icon slot) until `mounted === true`; read `resolvedTheme` only after mount |
