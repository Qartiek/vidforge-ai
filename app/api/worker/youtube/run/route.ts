import { NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization");
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await db.job.findFirst({
    where: { type: "YOUTUBE_PUBLISH", status: "QUEUED", attempts: { lt: 5 } },
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
