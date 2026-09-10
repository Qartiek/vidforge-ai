import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const rl = await rateLimit(`pipeline-start:${user.id}`, 10, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Pipeline start rate limit exceeded", resetAt: rl.resetAt }, { status: 429 });

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const scriptId = typeof body?.scriptId === "string" ? body.scriptId : "";
  if (!projectId || !scriptId) return NextResponse.json({ error: "projectId and scriptId are required" }, { status: 400 });

  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true, status: true } });
  const script = await db.contentScript.findFirst({ where: { id: scriptId, projectId }, select: { id: true } });
  if (!project || !script) return NextResponse.json({ error: "Project or script not found" }, { status: 404 });

  const existing = await db.job.findFirst({
    where: { userId: user.id, projectId, type: "production_pipeline", status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (existing) return NextResponse.json({ ok: true, jobId: existing.id, status: existing.status, alreadyRunning: true });

  const job = await db.job.create({
    data: {
      userId: user.id,
      projectId,
      type: "production_pipeline",
      status: "QUEUED",
      payload: JSON.stringify({ projectId, scriptId, approvalRequired: true }),
    },
  });
  await db.project.update({ where: { id: projectId }, data: { status: "PRODUCING" } });
  await db.auditLog.create({ data: { userId: user.id, action: "PIPELINE_START", resource: "Project", resourceId: projectId, success: true, metadata: JSON.stringify({ scriptId, jobId: job.id }) } });
  return NextResponse.json({ ok: true, jobId: job.id, status: job.status });
}
