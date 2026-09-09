import { NextResponse } from "next/server";
import { loginUser, createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`login:${ip}`, 10, 900);
  if (!rl.allowed) return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });

  const body = await request.json().catch(() => null);
  if (typeof body?.email !== "string" || typeof body?.password !== "string") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  try {
    const user = await loginUser(body.email, body.password);
    await createSession(user);
    await audit({ userId: user.id, action: "AUTH_LOGIN", resource: "USER", resourceId: user.id, ip });
    return NextResponse.json({ ok: true, user });
  } catch {
    await audit({ action: "AUTH_LOGIN_FAILED", resource: "AUTH", success: false, ip });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
