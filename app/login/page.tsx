"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left — branding panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-blue-600 p-12 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-base">L</span>
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">Ledger</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
            Your money,<br />finally clear.
          </h1>
          <p className="mt-5 text-blue-100 text-lg leading-relaxed max-w-sm">
            Snap a receipt, it&apos;s logged. Review later, budgets update automatically.
          </p>

          <div className="mt-10 space-y-3 max-w-sm">
            {[
              { name: "Groceries", icon: "🛒", pct: 72, spent: "JMD 14,400", budget: "JMD 20,000" },
              { name: "Transport", icon: "🚗", pct: 45, spent: "JMD 4,500",  budget: "JMD 10,000" },
              { name: "Utilities", icon: "⚡", pct: 96, spent: "JMD 19,200", budget: "JMD 20,000" },
            ].map((item) => (
              <div key={item.name} className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm border border-white/10">
                <div className="flex items-center justify-between text-sm mb-2.5">
                  <span className="text-white font-medium flex items-center gap-2">
                    <span>{item.icon}</span>{item.name}
                  </span>
                  <span className="text-blue-100 text-xs tabular-nums">
                    {item.spent} <span className="opacity-60">/ {item.budget}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/20">
                  <div
                    className={`h-full rounded-full ${
                      item.pct >= 90 ? "bg-red-400" : item.pct >= 70 ? "bg-amber-400" : "bg-white"
                    }`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/30" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-blue-700/40" />
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden mb-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ledger</h1>
          <p className="text-zinc-400 text-sm mt-1">Your personal finance tracker</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-zinc-400 mt-1.5">Sign in to your account to continue</p>
          </div>

          {sent ? (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-600/15 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">📬</span>
              </div>
              <p className="text-white font-semibold text-lg">Check your inbox</p>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Magic link sent to{" "}
                <span className="text-zinc-200 font-medium">{email}</span>
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-zinc-900 transition-colors shadow-sm"
              >
                {googleLoading ? (
                  <span className="text-zinc-500">Redirecting…</span>
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600">or</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />

                {error && (
                  <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-medium text-zinc-300 transition-colors"
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}
