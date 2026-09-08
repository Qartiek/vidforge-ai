import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";

function authorized(request: Request) {
  const expected = process.env.JOB_WORKER_SECRET;
  return !!expected && request.headers.get("x-job-worker-secret") === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const claimed = await db.$queryRaw<
    Array<{
      id: string;
      type: string;
      payload: unknown;
      projectId: string | null;
      attempts: number;
    }>
  >`
    WITH candidate AS (
      SELECT "id"
      FROM "Job"
      WHERE "status" = 'QUEUED'
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "Job" AS j
    SET
      "status" = 'RUNNING',
      "startedAt" = NOW(),
      "attempts" = j."attempts" + 1
    FROM candidate
    WHERE j."id" = candidate."id"
    RETURNING j."id", j."type", j."payload", j."projectId", j."attempts";
  `;

  if (claimed.length === 0) {
    return NextResponse.json({ job: null });
  }

  return NextResponse.json({ job: claimed[0] });
}
