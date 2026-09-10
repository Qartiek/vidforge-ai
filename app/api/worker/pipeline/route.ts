import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { enqueuePipelineStage, nextPipelineStage, type PipelinePayload, type PipelineStage } from "../../../../lib/pipeline";
import { executePipelineStage } from "../../../../lib/pipeline-stages";

export const runtime = "nodejs";
const STAGES: readonly PipelineStage[] = ["research", "content", "creative", "voice", "visuals", "editing", "captions", "seo", "repurpose", "quality", "publish", "analytics"];
const MAX_ATTEMPTS = 5;
const STALE_AFTER_MS = 60 * 60 * 1000;

function authorized(request: Request) {
  const expected = process.env.JOB_WORKER_SECRET;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { jobId?: string } | null;
  if (!body?.jobId || body.jobId.length > 128) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  const job = await db.job.findUnique({ where: { id: body.jobId } });
  if (!job) return NextResponse.json({ error: "Pipeline job not found" }, { status: 404 });
  if (job.status === "SUCCEEDED") return NextResponse.json({ status: "SUCCEEDED", jobId: job.id });

  // Recover a crashed worker lease, but only when the same observed lease
  // timestamp is still present. This prevents two workers from owning a job.
  if (job.status === "RUNNING") {
    if (!job.startedAt || Date.now() - job.startedAt.getTime() < STALE_AFTER_MS) {
      return NextResponse.json({ status: "RUNNING", jobId: job.id }, { status: 409 });
    }
    const recovered = await db.job.updateMany({
      where: { id: job.id, status: "RUNNING", startedAt: job.startedAt },
      data: { status: "QUEUED", finishedAt: null, error: "Stale worker lease recovered" },
    });
    if (recovered.count !== 1) return NextResponse.json({ status: "RUNNING", jobId: job.id }, { status: 409 });
  }

  if (job.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Maximum attempts exceeded" }, { status: 409 });
  const claimed = await db.job.updateMany({
    where: { id: job.id, status: "QUEUED", attempts: job.attempts },
    data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date(), error: null },
  });
  if (claimed.count !== 1) return NextResponse.json({ status: "RUNNING", jobId: job.id }, { status: 409 });

  try {
    if (job.type === "production_pipeline") {
      const raw = JSON.parse(job.payload) as { projectId?: string; scriptId?: string };
      if (raw.projectId !== job.projectId || !raw.scriptId) throw new Error("Invalid production pipeline payload");
      const next = await enqueuePipelineStage(job.userId, { projectId: raw.projectId, scriptId: raw.scriptId, stage: "research", previousJobId: job.id });
      await db.project.update({ where: { id: raw.projectId }, data: { status: "RESEARCHING" } });
      await db.job.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), error: null } });
      return NextResponse.json({ status: "SUCCEEDED", jobId: job.id, nextJobId: next.id, stage: "research" });
    }

    if (!job.type.startsWith("pipeline:")) throw new Error("Unsupported pipeline job type");
    const stage = job.type.slice("pipeline:".length) as PipelineStage;
    if (!STAGES.includes(stage)) throw new Error("Unsupported pipeline stage");
    const payload = JSON.parse(job.payload) as PipelinePayload;
    if (payload.projectId !== job.projectId || !payload.scriptId || payload.stage !== stage) throw new Error("Invalid pipeline job payload");

    const result = await executePipelineStage(stage, payload.projectId, payload.scriptId);
    const next = nextPipelineStage(stage);
    let nextJobId: string | null = null;
    let awaitingApproval = false;

    // Publishing is an explicit security boundary. Quality must succeed first,
    // then /api/pipeline/approve creates the actual YouTube upload job.
    if (next === "publish") {
      awaitingApproval = true;
      await db.project.update({ where: { id: payload.projectId }, data: { status: "PRODUCING" } });
    } else if (next) {
      const created = await enqueuePipelineStage(job.userId, {
        projectId: payload.projectId,
        scriptId: payload.scriptId,
        stage: next,
        previousJobId: job.id,
        metadata: { result },
      });
      nextJobId = created.id;
      if (next === "content") await db.project.update({ where: { id: payload.projectId }, data: { status: "SCRIPTING" } });
      else if (["creative", "voice", "visuals", "editing", "captions", "seo", "repurpose", "quality", "analytics"].includes(next)) {
        await db.project.update({ where: { id: payload.projectId }, data: { status: "PRODUCING" } });
      }
    } else {
      await db.project.update({ where: { id: payload.projectId }, data: { status: "COMPLETE" } });
    }

    await db.job.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), error: null } });
    return NextResponse.json({ status: "SUCCEEDED", jobId: job.id, stage, nextJobId, awaitingApproval, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline stage failed";
    const retryable = job.attempts < MAX_ATTEMPTS;
    await db.job.update({ where: { id: job.id }, data: { status: retryable ? "QUEUED" : "FAILED", finishedAt: retryable ? null : new Date(), error: message.slice(0, 1000) } });
    if (!retryable && job.projectId) await db.project.update({ where: { id: job.projectId }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Pipeline stage failed", jobId: job.id, retryable }, { status: retryable ? 503 : 500 });
  }
}
