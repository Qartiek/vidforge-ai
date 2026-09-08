import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../../lib/db";

const schema = z.object({ jobId: z.string().min(1), status: z.enum(["SUCCEEDED","FAILED"]), error: z.string().max(2000).optional() });
export async function POST(request: Request) {
  const expected = process.env.JOB_WORKER_SECRET;
  if (!expected || request.headers.get("x-job-worker-secret") !== expected) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid completion payload" }, { status: 400 });
  const result = await db.job.updateMany({ where: { id: parsed.data.jobId, status: "RUNNING" }, data: { status: parsed.data.status, error: parsed.data.error ?? null, finishedAt: new Date() } });
  if (result.count !== 1) return NextResponse.json({ error: "Job not found or not running" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
