import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { advancePipeline, type PipelinePayload } from "../../../../lib/pipeline";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.JOB_WORKER_SECRET;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

const STAGES = new Set(["voice", "visuals", "render", "thumbnail", "seo", "publish"]);

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { jobId?: string } | null;
  if (!body?.jobId || body.jobId.length > 128) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = await db.job.findUnique({ where: { id: body.jobId } });
  if (!job || !job.type.startsWith("pipeline:")) {
    return NextResponse.json({ error: "Pipeline job not found" }, { status: 404 });
  }
  if (job.status === "SUCCEEDED") return NextResponse.json({ status: "SUCCEEDED", jobId: job.id });
  if (job.status === "RUNNING") return NextResponse.json({ status: "RUNNING", jobId: job.id }, { status: 409 });

  const stage = job.type.slice("pipeline:".length);
  if (!STAGES.has(stage)) return NextResponse.json({ error: "Unsupported pipeline stage" }, { status: 400 });

  const claimed = await db.job.updateMany({
    where: { id: job.id, status: "QUEUED", attempts: job.attempts },
    data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date(), error: null },
  });
  if (claimed.count !== 1) return NextResponse.json({ status: "RUNNING", jobId: job.id }, { status: 409 });

  try {
    const payload = JSON.parse(job.payload) as PipelinePayload;
    if (payload.projectId !== job.projectId || !payload.scriptId || payload.stage !== stage) {
      throw new Error("Invalid pipeline job payload");
    }

    // Stage execution adapters will plug into this dispatcher. For now each
    // stage is represented by a durable job and advances only after a worker
    // invocation explicitly completes it; no fake media is generated.
    const next = await advancePipeline(job.id);
    await db.job.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), error: null } });

    return NextResponse.json({ status: "SUCCEEDED", jobId: job.id, nextJobId: next?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline stage failed";
    await db.job.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), error: message.slice(0, 1000) } });
    return NextResponse.json({ error: "Pipeline stage failed", jobId: job.id }, { status: 500 });
  }
}
