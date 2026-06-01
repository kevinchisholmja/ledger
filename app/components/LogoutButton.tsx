"use client";

import { createBrowserClient } from "@supabase/ssr";

export default function LogoutButton() {
  async function handleLogout() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      window.location.href = "/login";
      return;
    }
    const supabase = createBrowserClient(url, anonKey);
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
    >
      Sign out
    </button>
  );
}
