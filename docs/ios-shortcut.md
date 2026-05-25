# iOS Shortcut Setup — Ledger

The iOS Shortcut lets you log expenses from the share sheet or your home screen.
Snap a photo or share a PDF receipt → it uploads to Ledger → OCR runs → appears in Review.

---

## Prerequisites

- Ledger deployed to Vercel with `SHORTCUT_SECRET` set as an environment variable
- `SHORTCUT_SECRET` value copied from Vercel (Settings → Environment Variables)
- iPhone with iOS 16+ and the Shortcuts app

---

## Step 1 — Get your endpoint and secret

From Vercel, grab two values:

| Value | Where to find it |
|---|---|
| **Endpoint URL** | `https://your-app.vercel.app/api/shortcut/upload` |
| **SHORTCUT_SECRET** | Vercel → Settings → Environment Variables |

---

## Step 2 — Build the Shortcut

Open the **Shortcuts** app → tap **+** to create a new shortcut.

Add the following actions in order:

### Action 1 — Select Photos (or use share sheet input)

For a home screen button that picks a photo:
- Add action: **Select Photos** (Photos)
- Toggle off "Select Multiple"

For a share sheet shortcut (works from Photos or Files):
- Tap **Shortcut Details** → enable **Show in Share Sheet**
- Use the input automatically — no Select Photos action needed

### Action 2 — Get File from Input

- Add action: **Get File** (not "Get Details of Files")
- Input: the photo/file from the previous step or share sheet
- This ensures the file is in a format suitable for upload

### Action 3 — Get Contents of URL

This is the upload step. Tap **Get Contents of URL** and configure:

| Setting | Value |
|---|---|
| URL | `https://your-app.vercel.app/api/shortcut/upload` |
| Method | `POST` |
| Request Body | **Form** |

Add one form field:
| Field name | Value |
|---|---|
| `file` | Select "File" type → choose the file from Action 2 |

Add one header:
| Header name | Value |
|---|---|
| `x-shortcut-secret` | Paste your `SHORTCUT_SECRET` value |

### Action 4 — Get Dictionary Value (optional)

To see the OCR result after upload:
- Add action: **Get Dictionary Value**
- Key: `merchant` (or `amount`, `category`, `status`)
- Input: result from Get Contents of URL

### Action 5 — Show Notification (optional)

- Add action: **Show Notification**
- Title: `Ledger`
- Body: combine merchant + amount from the dictionary values
- Example: `Receipt logged — [merchant] [amount] [currency]`

---

## Step 3 — Name and save

- Tap the shortcut title at the top and name it **Log Receipt**
- Tap **Done**

---

## Step 4 — Add to Home Screen

- Open the shortcut → tap the **...** (ellipsis) menu
- Tap **Add to Home Screen**
- Choose an icon and name → tap **Add**

---

## Using the Shortcut

**From the home screen:** tap the shortcut → select a photo from camera roll → upload runs.

**From the share sheet (Photos app):** open a photo → tap Share → scroll to find **Log Receipt** → tap it.

**From the Files app:** long-press a PDF → Share → Log Receipt.

---

## Response format

On success the endpoint returns JSON:

```json
{
  "ok": true,
  "status": "pending_review",
  "merchant": "Super Plus",
  "amount": 4500,
  "currency": "JMD",
  "date": "2026-05-24",
  "category": "Groceries"
}
```

If OCR fails (blurry image, handwritten receipt), it returns:

```json
{
  "ok": true,
  "status": "pending_ocr",
  "message": "Receipt saved. OCR pending — open Ledger to review."
}
```

Either way, the expense appears in Ledger's Review queue.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| 401 Unauthorized | Check that `x-shortcut-secret` matches `SHORTCUT_SECRET` in Vercel exactly |
| 415 Unsupported file type | Only JPEG, PNG, HEIC, WebP, PDF are accepted |
| 400 Missing file field | The form field must be named `file` (lowercase) |
| Expense not appearing | Check Vercel function logs for OCR or DB errors |
| OCR pending on every upload | Image may be too blurry or low-res — try a better photo |
