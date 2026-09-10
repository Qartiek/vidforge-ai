import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";

function authorized(request: Request) {
  const cron = process.env.CRON_SECRET;
  const worker = process.env.JOB_WORKER_SECRET;
  const supplied = request.headers.get("authorization");
  return Boolean((cron && supplied === `Bearer ${cron}`) || (worker && supplied === `Bearer ${worker}`));
}

function routeFor(type: string) {
  if (type === "production_pipeline" || type.startsWith("pipeline:")) return "/api/worker/pipeline";
  if (type === "YOUTUBE_PUBLISH") return "/api/worker/youtube";
  if (type === "ANALYTICS_OPTIMIZATION") return "/api/worker/analytics";
  return null;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const jobs = await db.job.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, take: 5, select: { id: true, type: true } });
  const runnable = jobs.filter((job) => routeFor(job.type));
  const origin = new URL(request.url).origin;
  const secret = process.env.JOB_WORKER_SECRET;
  if (!secret) return NextResponse.json({ error: "JOB_WORKER_SECRET is not configured" }, { status: 500 });
  const results = await Promise.allSettled(runnable.map(async (job) => {
    const response = await fetch(`${origin}${routeFor(job.type)}`, { method: "POST", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify({ jobId: job.id }), cache: "no-store" });
    return { jobId: job.id, type: job.type, status: response.status, body: await response.json().catch(() => null) };
  }));
  return NextResponse.json({ processed: runnable.length, skipped: jobs.length - runnable.length, results: results.map((result) => result.status === "fulfilled" ? result.value : { error: String(result.reason) }) });
}

export async function GET(request: Request) { return POST(request); }
