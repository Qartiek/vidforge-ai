import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser, createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Password must be at least 8 characters and email must be valid" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const [ipRl, emailRl] = await Promise.all([
    rateLimit(`register:ip:${ip}`, 5, 3600),
    rateLimit(`register:email:${email}`, 3, 3600),
  ]);
  if (!ipRl.allowed || !emailRl.allowed) return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });

  try {
    const user = await registerUser(email, parsed.data.password, parsed.data.name);
    await createSession(user);
    await audit({ userId: user.id, action: "AUTH_REGISTER", resource: "USER", resourceId: user.id, ip });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("AUTH_REGISTER_FAILED", error);
    await audit({ action: "AUTH_REGISTER_FAILED", resource: "AUTH", success: false, ip });
    return NextResponse.json({ error: "Unable to create account. If this email is already registered, please use Login." }, { status: 409 });
  }
}
