import { NextResponse } from "next/server";
import { loginUser, createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = await request.json().catch(() => null);
  if (typeof body?.email !== "string" || typeof body?.password !== "string") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const email = body.email.trim().toLowerCase();
  if (!email || body.password.length < 8 || body.password.length > 128) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const [ipRl, emailRl] = await Promise.all([
      rateLimit(`login:ip:${ip}`, 10, 900),
      rateLimit(`login:email:${email}`, 10, 900),
    ]);
    if (!ipRl.allowed || !emailRl.allowed) {
      return NextResponse.json({ error: "Too many login attempts" }, { status: 429, headers: { "Cache-Control": "no-store" } });
    }

    const user = await loginUser(email, body.password);
    await createSession(user);
    try { await audit({ userId: user.id, action: "AUTH_LOGIN", resource: "USER", resourceId: user.id, ip }); } catch {}
    return NextResponse.json({ ok: true, user }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    try { await audit({ action: "AUTH_LOGIN_FAILED", resource: "AUTH", success: false, ip }); } catch {}
    return NextResponse.json({ error: "Unable to sign in right now. Please check your account and try again." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}
