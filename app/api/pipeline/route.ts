import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rate-limit";
import { db } from "../../../lib/db";
import { executePipelineStage } from "../../../lib/pipeline-stages";

const allowedStages = [
  "research", "content", "creative", "voice", "visuals", "editing", "captions", "seo", "repurpose", "quality", "publish", "analytics",
] as const;
type Stage = (typeof allowedStages)[number];

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const rl = await rateLimit(`pipeline:${user.id}`, 20, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Pipeline rate limit exceeded", resetAt: rl.resetAt }, { status: 429 });
  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const scriptId = typeof body?.scriptId === "string" ? body.scriptId : "";
  const stage = typeof body?.stage === "string" ? body.stage as Stage : null;
  if (!projectId || !scriptId || !stage || !allowedStages.includes(stage)) return NextResponse.json({ error: "projectId, scriptId and a valid stage are required" }, { status: 400 });
  try {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const result = await executePipelineStage(stage, projectId, scriptId);
    await db.auditLog.create({ data: { userId: user.id, action: `PIPELINE_${stage.toUpperCase()}`, resource: "Project", resourceId: projectId, success: true, metadata: JSON.stringify({ scriptId }) } });
    return NextResponse.json({ ok: true, stage, projectId, scriptId, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline stage failed";
    await db.auditLog.create({ data: { userId: user.id, action: `PIPELINE_${stage.toUpperCase()}`, resource: "Project", resourceId: projectId, success: false, metadata: JSON.stringify({ scriptId, error: message.slice(0, 500) }) } }).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
