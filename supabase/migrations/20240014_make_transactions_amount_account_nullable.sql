-- Phase A4: make amount and account_id nullable on transactions
-- amount is null for pending_ocr entries (amount unknown until review)
-- account_id is null for OCR-sourced entries (account assigned in review UI)
ALTER TABLE transactions ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN account_id DROP NOT NULL;
