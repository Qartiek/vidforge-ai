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

  const project = await db.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: { scripts: true, assets: true },
  });
  const script = project?.scripts[0];
  if (!project || !script || script.id !== scriptId) {
    return NextResponse.json({ error: "Project/script not found" }, { status: 404 });
  }

  const quality = await db.job.findFirst({
    where: { projectId, userId: user.id, type: "pipeline:quality", status: "SUCCEEDED" },
    orderBy: { createdAt: "desc" },
  });
  if (!quality) return NextResponse.json({ error: "Quality control must pass before publishing" }, { status: 409 });

  const existingUpload = await db.job.findFirst({
    where: { projectId, userId: user.id, type: "YOUTUBE_PUBLISH", status: { in: ["QUEUED", "RUNNING", "SUCCEEDED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existingUpload) {
    return NextResponse.json({ ok: true, approved: true, jobId: existingUpload.id, status: existingUpload.status, reused: true });
  }

  const result = await executePipelineStage("publish", projectId, scriptId) as { publishId?: string; status?: string };
  if (!result.publishId) return NextResponse.json({ error: "Publish preparation did not return a publish id" }, { status: 500 });

  // Approval is the explicit security boundary. Only after approval do we
  // create the actual upload job consumed by the YouTube worker.
  const uploadJob = await db.job.create({
    data: {
      userId: user.id,
      projectId,
      type: "YOUTUBE_PUBLISH",
      status: "QUEUED",
      payload: JSON.stringify({ publishId: result.publishId, approvedAt: new Date().toISOString() }),
    },
  });

  await db.project.update({ where: { id: projectId }, data: { status: "PRODUCING" } });
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "PIPELINE_PUBLISH_APPROVED",
      resource: "Project",
      resourceId: projectId,
      success: true,
      metadata: JSON.stringify({ scriptId, publishId: result.publishId, uploadJobId: uploadJob.id }),
    },
  });

  return NextResponse.json({
    ok: true,
    approved: true,
    publishId: result.publishId,
    jobId: uploadJob.id,
    status: uploadJob.status,
    result,
  });
}
