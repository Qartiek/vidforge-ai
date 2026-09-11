import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
const CRON_SECRET = process.env.CRON_SECRET;

function authorized(request: Request) {
  const supplied = request.headers.get("authorization");
  return Boolean(CRON_SECRET && supplied === `Bearer ${CRON_SECRET}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const pipelineJobs = await db.job.findMany({
      where: { status: "QUEUED", type: { startsWith: "pipeline" } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const youtubeJobs = await db.job.findMany({
      where: { status: "QUEUED", type: "YOUTUBE_PUBLISH" },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    const analyticsJobs = await db.job.findMany({
      where: { status: "QUEUED", type: "ANALYTICS_OPTIMIZATION" },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    return NextResponse.json({
      ok: true,
      dispatched: {
        pipeline: pipelineJobs.length,
        youtube: youtubeJobs.length,
        analytics: analyticsJobs.length,
      },
    });
  } catch (error) {
    console.error("WORKER_DISPATCH_FAILED", error);
    return NextResponse.json({ error: "Worker dispatch failed" }, { status: 500 });
  }
}
