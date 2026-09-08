import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) });
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const rl = await rateLimit(`login:${ip}:${email}`, 10, 900);
  if (!rl.allowed) return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) {
    await audit({ userId: user?.id, action: "AUTH_LOGIN", resource: "USER", resourceId: user?.id, success: false, ip });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  await audit({ userId: user.id, action: "AUTH_LOGIN", resource: "USER", resourceId: user.id, ip });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
