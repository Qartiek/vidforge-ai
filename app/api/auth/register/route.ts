import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(12).max(128), name: z.string().trim().min(1).max(80).optional() });
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`register:${ip}`, 5, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid registration data" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ error: "Unable to create account" }, { status: 409 });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await db.user.create({ data: { email, name: parsed.data.name, passwordHash }, select: { id: true, email: true, name: true, role: true } });
  await createSession(user);
  await audit({ userId: user.id, action: "AUTH_REGISTER", resource: "USER", resourceId: user.id, ip });
  return NextResponse.json({ user }, { status: 201 });
}
