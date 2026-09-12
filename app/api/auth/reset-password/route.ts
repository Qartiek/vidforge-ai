import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/password-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.token !== "string" || typeof body?.password !== "string") {
    return NextResponse.json({ error: "Invalid reset request" }, { status: 400, headers: noStore });
  }

  try {
    await resetPassword(body.token, body.password);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("PASSWORD_RESET_FAILED", error);
    const message = error instanceof Error ? error.message : "Unable to reset password";
    return NextResponse.json({ error: message }, { status: 400, headers: noStore });
  }
}
