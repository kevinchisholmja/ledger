# Google OAuth Setup

Enables "Continue with Google" on the login page. One-time setup per environment.

## Step 1 — Supabase Dashboard

1. Go to **Authentication → Providers → Google** → toggle **Enabled**
2. Copy the **Callback URL** shown — format: `https://[ref].supabase.co/auth/v1/callback`
3. Leave the tab open

## Step 2 — Google Cloud Console

1. Open [console.cloud.google.com](https://console.cloud.google.com) → select or create a project
2. **Google Auth Platform → Branding** — fill in app name + support email → Save
3. **Google Auth Platform → Audience** → set to External, add your Gmail as a test user
4. **Google Auth Platform → Clients → Create Client**
   - Application type: **Web application**
   - Name: anything (e.g. "Web client 1")
   - **Authorized JavaScript origins:** `https://ledger-gules-seven.vercel.app`
   - **Authorized redirect URIs:** paste the Supabase callback URL from Step 1
   - Click **Create**
5. From the confirmation dialog (or by clicking the client in the list) — copy **Client ID** and **Client Secret**

## Step 3 — Back in Supabase

Paste the Client ID and Client Secret into the Google provider form → **Save**.

## Updating after a domain change

If the Vercel URL changes or a custom domain is added:
- Add the new URL to **Authorized JavaScript origins** in Google Cloud Console (Clients → edit)
- Add the new URL to Supabase **Authentication → URL Configuration → Redirect URLs** if needed
