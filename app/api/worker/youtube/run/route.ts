import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const STALE_AFTER_MS = 60 * 60 * 1000;

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization");
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Recover jobs abandoned by a crashed worker. A one-hour lease avoids
  // interfering with legitimate long-running video uploads.
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);
  await db.$transaction(async (tx) => {
    await tx.job.updateMany({
      where: {
        type: "YOUTUBE_PUBLISH",
        status: "RUNNING",
        startedAt: { lt: staleBefore },
        attempts: { lt: MAX_ATTEMPTS },
      },
      data: {
        status: "QUEUED",
        finishedAt: null,
        error: "Worker lease expired; job requeued",
      },
    });

    await tx.job.updateMany({
      where: {
        type: "YOUTUBE_PUBLISH",
        status: "RUNNING",
        startedAt: { lt: staleBefore },
        attempts: { gte: MAX_ATTEMPTS },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: "Worker lease expired after maximum retry attempts",
      },
    });
  });

  const job = await db.job.findFirst({
    where: { type: "YOUTUBE_PUBLISH", status: "QUEUED", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!job) return NextResponse.json({ processed: false, reason: "No queued YouTube jobs" });

  const baseUrl = process.env.APP_URL?.replace(/\/$/, "");
  const workerSecret = process.env.JOB_WORKER_SECRET;
  if (!baseUrl || !workerSecret) {
    return NextResponse.json({ error: "Worker runtime is not configured" }, { status: 503 });
  }

  const response = await fetch(`${baseUrl}/api/worker/youtube`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${workerSecret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ jobId: job.id }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({ error: "Worker returned an invalid response" }));
  return NextResponse.json({ processed: true, jobId: job.id, worker: data }, { status: response.ok ? 200 : response.status });
}
