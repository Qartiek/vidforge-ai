import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeTopic } from "../../../lib/security";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rate-limit";
import { audit } from "../../../lib/audit";

const createSchema = z.object({ topic: z.string().trim().min(3).max(500), title: z.string().trim().min(1).max(120).optional() });
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const projects = await db.project.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ projects });
}
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const rl = await rateLimit(`project-create:${user.id}`, 30, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid project data" }, { status: 400 });
  const topic = sanitizeTopic(parsed.data.topic);
  if (!topic) return NextResponse.json({ error: "A valid topic is required" }, { status: 400 });
  const project = await db.project.create({ data: { userId: user.id, topic, title: parsed.data.title ?? topic.slice(0, 80), status: "QUEUED" } });
  await audit({ userId: user.id, action: "PROJECT_CREATE", resource: "PROJECT", resourceId: project.id, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() });
  return NextResponse.json({ id: project.id, topic: project.topic, title: project.title, status: project.status, creditsRequired: 1 }, { status: 201 });
}
