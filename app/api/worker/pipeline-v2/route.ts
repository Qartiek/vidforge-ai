import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { enqueuePipelineStage, type PipelinePayload } from "../../../../lib/pipeline";
import { executePipelineStage } from "../../../../lib/pipeline-stages";

export const runtime = "nodejs";
const MAX_ATTEMPTS = 5;
const STAGES = ["voice", "visuals", "editing", "captions", "creative", "seo", "repurpose", "quality", "publish", "analytics"] as const;
type Stage = (typeof STAGES)[number];
function authorized(request: Request) { const expected = process.env.JOB_WORKER_SECRET; return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`); }

function nextStage(stage: Stage): Stage | null {
  const i = STAGES.indexOf(stage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { jobId?: string } | null;
  if (!body?.jobId || body.jobId.length > 128) return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  const job = await db.job.findUnique({ where: { id: body.jobId } });
  if (!job) return NextResponse.json({ error: "Pipeline job not found" }, { status: 404 });
  if (job.status === "SUCCEEDED") return NextResponse.json({ status: "SUCCEEDED", jobId: job.id });
  if (job.status === "RUNNING") return NextResponse.json({ status: "RUNNING", jobId: job.id }, { status: 409 });
  if (job.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Maximum attempts exceeded" }, { status: 409 });
  const claimed = await db.job.updateMany({ where: { id: job.id, status: "QUEUED", attempts: job.attempts }, data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date(), error: null } });
  if (claimed.count !== 1) return NextResponse.json({ status: "RUNNING", jobId: job.id }, { status: 409 });
  try {
    if (job.type === "production_pipeline") {
      const raw = JSON.parse(job.payload) as { projectId?: string; scriptId?: string };
      if (raw.projectId !== job.projectId || !raw.scriptId) throw new Error("Invalid production pipeline payload");
      const next = await enqueuePipelineStage(job.userId, { projectId: raw.projectId, scriptId: raw.scriptId, stage: "voice" as PipelinePayload["stage"], previousJobId: job.id });
      await db.job.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), error: null } });
      return NextResponse.json({ status: "SUCCEEDED", jobId: job.id, nextJobId: next.id, stage: "voice" });
    }
    if (!job.type.startsWith("pipeline:")) throw new Error("Unsupported pipeline job type");
    const stage = job.type.slice("pipeline:".length) as Stage;
    if (!STAGES.includes(stage)) throw new Error("Unsupported pipeline stage");
    const payload = JSON.parse(job.payload) as PipelinePayload;
    if (payload.projectId !== job.projectId || !payload.scriptId || payload.stage !== stage) throw new Error("Invalid pipeline job payload");
    const result = await executePipelineStage(stage, payload.projectId, payload.scriptId);
    const next = nextStage(stage);
    let nextJobId: string | null = null;
    if (next) {
      const created = await enqueuePipelineStage(job.userId, { projectId: payload.projectId, scriptId: payload.scriptId, stage: next as PipelinePayload["stage"], previousJobId: job.id, metadata: { result } });
      nextJobId = created.id;
    } else {
      await db.project.update({ where: { id: payload.projectId }, data: { status: "COMPLETE" } });
    }
    await db.job.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), error: null } });
    return NextResponse.json({ status: "SUCCEEDED", jobId: job.id, stage, nextJobId, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline stage failed";
    const retryable = job.attempts < MAX_ATTEMPTS;
    await db.job.update({ where: { id: job.id }, data: { status: retryable ? "QUEUED" : "FAILED", finishedAt: retryable ? null : new Date(), error: message.slice(0, 1000) } });
    return NextResponse.json({ error: "Pipeline stage failed", jobId: job.id, retryable }, { status: retryable ? 503 : 500 });
  }
}
