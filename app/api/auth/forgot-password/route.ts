import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { createPasswordResetToken, sendPasswordResetEmail } from "../../../../lib/password-reset";
import { rateLimit } from "../../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genericMessage = "If an account exists for that email, a password reset link has been sent.";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ message: genericMessage }, { headers: noStore });
  }

  try {
    const rl = await rateLimit(`password-reset:${ip}:${email}`, 3, 3600);
    if (!rl.allowed) return NextResponse.json({ message: genericMessage }, { headers: noStore });

    const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const url = new URL("/reset-password", request.url);
      url.searchParams.set("token", token);
      await sendPasswordResetEmail(user.email, url.toString());
    }
  } catch (error) {
    console.error("PASSWORD_RESET_REQUEST_FAILED", error);
    return NextResponse.json({ error: "Password reset email is temporarily unavailable. Please try again later." }, { status: 503, headers: noStore });
  }

  return NextResponse.json({ message: genericMessage }, { headers: noStore });
}
