# Incident Log

| Date | Issue | Root cause | Fix |
|---|---|---|---|
| 2026-05-24 | "Couldn't save that" on all text messages | `amount NOT NULL` violated by manual entries (amount is unknown until review) | Migration 20240004: dropped NOT NULL on expenses.amount |
| 2026-05-24 | PDF receipts silently ignored | Webhook only checked `message.photo`, not `message.document` | Updated webhook to detect document MIME type and route to same OCR flow |
