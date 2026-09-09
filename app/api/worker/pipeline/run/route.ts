import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";

export const runtime = "nodejs";
const MAX_ATTEMPTS = 5;
const STALE_AFTER_MS = 30 * 60 * 1000;

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);
  await db.job.updateMany({
    where: {
      type: { startsWith: "pipeline:" },
      status: "RUNNING",
      startedAt: { lt: staleBefore },
      attempts: { lt: MAX_ATTEMPTS },
    },
    data: { status: "QUEUED", finishedAt: null, error: "Worker lease expired; job requeued" },
  });
  await db.job.updateMany({
    where: {
      type: { startsWith: "pipeline:" },
      status: "RUNNING",
      startedAt: { lt: staleBefore },
      attempts: { gte: MAX_ATTEMPTS },
    },
    data: { status: "FAILED", finishedAt: new Date(), error: "Worker lease expired after maximum attempts" },
  });

  const job = await db.job.findFirst({
    where: {
      status: "QUEUED",
      OR: [{ type: "production_pipeline" }, { type: { startsWith: "pipeline:" } }],
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!job) return NextResponse.json({ processed: false, reason: "No queued pipeline jobs" });

  const baseUrl = process.env.APP_URL?.replace(/\/$/, "");
  const workerSecret = process.env.JOB_WORKER_SECRET;
  if (!baseUrl || !workerSecret) return NextResponse.json({ error: "Worker runtime is not configured" }, { status: 503 });

  const response = await fetch(`${baseUrl}/api/worker/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${workerSecret}`, "content-type": "application/json" },
    body: JSON.stringify({ jobId: job.id }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ error: "Worker returned invalid response" }));
  return NextResponse.json({ processed: true, jobId: job.id, worker: data }, { status: response.ok ? 200 : response.status });
}
