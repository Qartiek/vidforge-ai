import { NextResponse } from "next/server";
import { loginUser, createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = await request.json().catch(() => null);
  if (typeof body?.email !== "string" || typeof body?.password !== "string") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const email = body.email.trim().toLowerCase();
  const [ipRl, emailRl] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 10, 900),
    rateLimit(`login:email:${email}`, 10, 900),
  ]);
  if (!ipRl.allowed || !emailRl.allowed) {
    return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
  }

  let user;
  try {
    user = await loginUser(email, body.password);
  } catch {
    try { await audit({ action: "AUTH_LOGIN_FAILED", resource: "AUTH", success: false, ip }); } catch {}
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    await createSession(user);
  } catch {
    return NextResponse.json({ error: "Login service is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try { await audit({ userId: user.id, action: "AUTH_LOGIN", resource: "USER", resourceId: user.id, ip }); } catch {}
  return NextResponse.json({ ok: true, user }, { headers: { "Cache-Control": "no-store" } });
}
