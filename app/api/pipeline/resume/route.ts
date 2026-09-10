import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { executePipelineStage } from "../../../../lib/pipeline-stages";
import { getPipelineState, nextStage } from "../../../../lib/pipeline-state";

const MAX_RETRIES = 3;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const scriptId = typeof body?.scriptId === "string" ? body.scriptId : "";
  if (!projectId || !scriptId) return NextResponse.json({ error: "projectId and scriptId are required" }, { status: 400 });
  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const state = await getPipelineState(projectId, user.id);
  const failed = state.failed[0];
  const stage = failed || nextStage(state.completed);
  if (!stage) return NextResponse.json({ ok: true, status: "complete", state });
  const existing = state.jobs.find(j => j.type === `PIPELINE_${stage.toUpperCase()}` && j.status === "FAILED");
  if (existing && existing.attempts >= MAX_RETRIES) return NextResponse.json({ error: `Stage ${stage} reached the ${MAX_RETRIES}-attempt retry limit`, state }, { status: 409 });
  try {
    const result = await executePipelineStage(stage, projectId, scriptId);
    await db.auditLog.create({ data: { userId: user.id, action: `PIPELINE_RESUME_${stage.toUpperCase()}`, resource: "Project", resourceId: projectId, success: true, metadata: JSON.stringify({ scriptId, retry: Boolean(existing) }) } });
    return NextResponse.json({ ok: true, resumed: stage, result, state: await getPipelineState(projectId, user.id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline resume failed";
    await db.auditLog.create({ data: { userId: user.id, action: `PIPELINE_RESUME_${stage.toUpperCase()}`, resource: "Project", resourceId: projectId, success: false, metadata: JSON.stringify({ scriptId, error: message.slice(0, 500) }) } }).catch(() => undefined);
    return NextResponse.json({ error: message, stage, state: await getPipelineState(projectId, user.id) }, { status: 500 });
  }
}
