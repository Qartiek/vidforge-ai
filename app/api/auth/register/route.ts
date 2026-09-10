import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser, createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use a valid email and a password of at least 12 characters." }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const [ipRl, emailRl] = await Promise.all([
    rateLimit(`register:ip:${ip}`, 5, 3600),
    rateLimit(`register:email:${email}`, 3, 3600),
  ]);
  if (!ipRl.allowed || !emailRl.allowed) {
    return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
  }

  let user;
  try {
    user = await registerUser(email, parsed.data.password, parsed.data.name);
  } catch {
    try { await audit({ action: "AUTH_REGISTER_FAILED", resource: "AUTH", success: false, ip }); } catch {}
    return NextResponse.json({ error: "Unable to create account. The email may already be registered." }, { status: 409 });
  }

  try {
    await createSession(user);
  } catch {
    return NextResponse.json({ error: "Account was created, but login is temporarily unavailable. Please sign in again shortly." }, { status: 503 });
  }

  try { await audit({ userId: user.id, action: "AUTH_REGISTER", resource: "USER", resourceId: user.id, ip }); } catch {}
  return NextResponse.json({ user }, { status: 201 });
}
