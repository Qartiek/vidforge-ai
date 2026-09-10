import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";

function authorized(request: Request) {
  const cron = process.env.CRON_SECRET;
  const worker = process.env.JOB_WORKER_SECRET;
  const supplied = request.headers.get("authorization");
  return Boolean((cron && supplied === `Bearer ${cron}`) || (worker && supplied === `Bearer ${worker}`));
}

const ROUTES: Record<string, string> = {
  production_pipeline: "/api/worker/pipeline",
  YOUTUBE_PUBLISH: "/api/worker/youtube",
  ANALYTICS_OPTIMIZATION: "/api/worker/analytics",
};

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const jobs = await db.job.findMany({ where: { status: "QUEUED", type: { in: Object.keys(ROUTES) } }, orderBy: { createdAt: "asc" }, take: 5, select: { id: true, type: true } });
  const origin = new URL(request.url).origin;
  const secret = process.env.JOB_WORKER_SECRET;
  if (!secret) return NextResponse.json({ error: "JOB_WORKER_SECRET is not configured" }, { status: 500 });
  const results = await Promise.allSettled(jobs.map(async (job) => {
    const response = await fetch(`${origin}${ROUTES[job.type]}`, { method: "POST", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify({ jobId: job.id }), cache: "no-store" });
    return { jobId: job.id, type: job.type, status: response.status, body: await response.json().catch(() => null) };
  }));
  return NextResponse.json({ processed: jobs.length, results: results.map((result) => result.status === "fulfilled" ? result.value : { error: String(result.reason) }) });
}

export async function GET(request: Request) { return POST(request); }
