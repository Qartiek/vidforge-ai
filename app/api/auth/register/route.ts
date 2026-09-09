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
  if (!parsed.success) return NextResponse.json({ error: "Invalid registration data" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const [ipRl, emailRl] = await Promise.all([
    rateLimit(`register:ip:${ip}`, 5, 3600),
    rateLimit(`register:email:${email}`, 3, 3600),
  ]);
  if (!ipRl.allowed || !emailRl.allowed) {
    return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
  }

  try {
    const user = await registerUser(email, parsed.data.password, parsed.data.name);
    await createSession(user);
    await audit({ userId: user.id, action: "AUTH_REGISTER", resource: "USER", resourceId: user.id, ip });
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    // Do not disclose whether an email already exists; this also handles the
    // database unique constraint race when two registrations arrive together.
    await audit({ action: "AUTH_REGISTER_FAILED", resource: "AUTH", success: false, ip });
    return NextResponse.json({ error: "Unable to create account" }, { status: 409 });
  }
}
