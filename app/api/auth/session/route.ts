import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json(
      { authenticated: Boolean(user), user },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    console.error("AUTH_SESSION_FAILED", error);
    return NextResponse.json(
      { authenticated: false, user: null, error: "Session service unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  }
}
