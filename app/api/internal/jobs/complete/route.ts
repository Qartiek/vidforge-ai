import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../../lib/db";

const schema = z.object({
  jobId: z.string().min(1).max(100),
  status: z.enum(["SUCCEEDED", "FAILED"]),
  error: z.string().max(2000).optional(),
  youtubeVideoId: z.string().min(1).max(100).optional(),
});

const publishPayloadSchema = z.object({
  publishId: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const expected = process.env.JOB_WORKER_SECRET;
  if (!expected || request.headers.get("x-job-worker-secret") !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid completion payload" }, { status: 400 });
  }

  const { jobId, status, error, youtubeVideoId } = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
        select: { id: true, userId: true, type: true, status: true, payload: true },
      });

      if (!job || job.status !== "RUNNING") {
        return { conflict: true as const };
      }

      if (job.type === "YOUTUBE_PUBLISH") {
        let payload: unknown;
        try {
          payload = JSON.parse(job.payload);
        } catch {
          throw new Error("Invalid publish job payload");
        }

        const publishPayload = publishPayloadSchema.safeParse(payload);
        if (!publishPayload.success) {
          throw new Error("Invalid publish job payload");
        }

        await tx.youTubePublish.updateMany({
          where: {
            id: publishPayload.data.publishId,
            userId: job.userId,
            status: { in: ["QUEUED", "UPLOADING"] },
          },
          data:
            status === "SUCCEEDED"
              ? {
                  status: "PUBLISHED",
                  youtubeVideoId: youtubeVideoId ?? null,
                  error: null,
                  publishedAt: new Date(),
                }
              : {
                  status: "FAILED",
                  error: error ?? "YouTube publish job failed",
                },
        });
      }

      await tx.job.update({
        where: { id: job.id },
        data: {
          status,
          error: error ?? null,
          finishedAt: new Date(),
        },
      });

      return { conflict: false as const };
    });

    if (result.conflict) {
      return NextResponse.json({ error: "Job not found or not running" }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Internal job completion failed", error);
    return NextResponse.json({ error: "Unable to complete job" }, { status: 500 });
  }
}
