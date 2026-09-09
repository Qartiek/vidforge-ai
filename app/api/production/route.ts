import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { buildProductionPlan } from "../../../lib/production";
import { rateLimit } from "../../../lib/rate-limit";
import { audit } from "../../../lib/audit";
const schema = z.object({ projectId: z.string().min(1).max(100) });
export async function POST(request: Request) {
  const user = await getSessionUser(); if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const rl = await rateLimit(`production-entry:${user.id}`, 10, 3600); if (!rl.allowed) return NextResponse.json({ error: "Production rate limit exceeded" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  const project = await db.project.findFirst({ where: { id: parsed.data.projectId, userId: user.id }, include: { scripts: true } });
  const script = project?.scripts[0];
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!script) return NextResponse.json({ error: "Generate the hook and script first" }, { status: 400 });
  const existing = await db.job.findFirst({ where: { projectId: project.id, userId: user.id, type: "production_pipeline", status: { in: ["QUEUED", "RUNNING"] } }, orderBy: { createdAt: "desc" } });
  if (existing) return NextResponse.json({ jobId: existing.id, status: existing.status, reused: true }, { status: 202 });
  const plan = buildProductionPlan(script.script);
  const job = await db.job.create({ data: { userId: user.id, projectId: project.id, type: "production_pipeline", status: "QUEUED", payload: JSON.stringify({ projectId: project.id, scriptId: script.id, plan }) } });
  await db.project.update({ where: { id: project.id }, data: { status: "PRODUCING" } });
  await audit({ userId: user.id, action: "PRODUCTION_PIPELINE_QUEUED", resource: "PROJECT", resourceId: project.id, metadata: { jobId: job.id, sceneCount: plan.scenes.length } });
  return NextResponse.json({ jobId: job.id, status: job.status, plan }, { status: 202 });
}
