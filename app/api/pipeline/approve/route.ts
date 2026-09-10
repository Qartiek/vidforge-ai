import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { executePipelineStage } from "../../../../lib/pipeline-stages";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const scriptId = typeof body?.scriptId === "string" ? body.scriptId : "";
  if (!projectId || !scriptId) return NextResponse.json({ error: "projectId and scriptId are required" }, { status: 400 });
  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, include: { scripts: true, assets: true } });
  const script = project?.scripts[0];
  if (!project || !script || script.id !== scriptId) return NextResponse.json({ error: "Project/script not found" }, { status: 404 });
  const quality = await db.job.findFirst({ where: { projectId, userId: user.id, type: "pipeline:quality", status: "SUCCEEDED" }, orderBy: { createdAt: "desc" } });
  if (!quality) return NextResponse.json({ error: "Quality control must pass before publishing" }, { status: 409 });
  const existing = await db.job.findFirst({ where: { projectId, userId: user.id, type: "pipeline:publish", status: { in: ["QUEUED", "RUNNING", "SUCCEEDED"] } }, orderBy: { createdAt: "desc" } });
  if (existing) return NextResponse.json({ ok: true, approved: true, jobId: existing.id, status: existing.status, reused: true });
  const result = await executePipelineStage("publish", projectId, scriptId);
  await db.auditLog.create({ data: { userId: user.id, action: "PIPELINE_PUBLISH_APPROVED", resource: "Project", resourceId: projectId, success: true, metadata: JSON.stringify({ scriptId, result }) } });
  return NextResponse.json({ ok: true, approved: true, result });
}
