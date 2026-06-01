import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// DEV ONLY: Set session cookies server-side after client-side auth
// This works around iframe cookie restrictions in v0 sandbox
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: "Missing tokens" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    // Set the session using the tokens from client-side auth
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error("[v0] setSession error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log("[v0] Session set server-side for user:", data.user?.email);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[v0] set-session error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
