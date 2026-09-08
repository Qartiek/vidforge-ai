import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";

function authorized(request: Request) { const expected = process.env.JOB_WORKER_SECRET; return !!expected && request.headers.get("x-job-worker-secret") === expected; }
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  for (let i = 0; i < 3; i++) {
    const candidate = await db.job.findFirst({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!candidate) return NextResponse.json({ job: null });
    const claimed = await db.job.updateMany({ where: { id: candidate.id, status: "QUEUED" }, data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } } });
    if (claimed.count === 1) {
      const job = await db.job.findUnique({ where: { id: candidate.id }, select: { id: true, type: true, payload: true, projectId: true, attempts: true } });
      return NextResponse.json({ job });
    }
  }
  return NextResponse.json({ job: null });
}
