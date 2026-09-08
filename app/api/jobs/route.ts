import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rate-limit";
import { audit } from "../../../lib/audit";

const schema = z.object({ projectId: z.string().min(1), type: z.enum(["research","content","voice","visuals","render","thumbnail","seo"]), payload: z.record(z.string(), z.unknown()).default({}) });
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const rl = await rateLimit(`job-create:${user.id}`, 20, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid job request" }, { status: 400 });
  const project = await db.project.findFirst({ where: { id: parsed.data.projectId, userId: user.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const job = await db.job.create({ data: { userId: user.id, projectId: project.id, type: parsed.data.type, payload: JSON.stringify(parsed.data.payload) } });
  await audit({ userId: user.id, action: "JOB_CREATE", resource: "JOB", resourceId: job.id, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), metadata: { type: job.type } });
  return NextResponse.json({ id: job.id, status: job.status }, { status: 202 });
}
