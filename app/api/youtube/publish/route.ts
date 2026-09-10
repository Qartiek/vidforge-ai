import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { audit } from "../../../../lib/audit";
import { rateLimit } from "../../../../lib/rate-limit";

const schema = z.object({
  projectId: z.string().cuid(),
  idempotencyKey: z.string().min(16).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  title: z.string().trim().min(1).max(100),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).optional(),
  privacyStatus: z.enum(["private", "unlisted", "public"]).default("private"),
  assetRef: z.string().cuid(),
});

export async function POST(request: Request) {
  const user = await requireAuth();
  const limited = await rateLimit(`youtube-publish:${user.id}`, 10, 60);
  if (!limited.allowed) return NextResponse.json({ error: "Too many publish requests", retryAt: limited.resetAt.toISOString() }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid publish request" }, { status: 400 });
  const input = parsed.data;

  const connection = await db.youTubeConnection.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!connection) return NextResponse.json({ error: "Connect YouTube before publishing" }, { status: 409 });

  const project = await db.project.findFirst({ where: { id: input.projectId, userId: user.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Resolve the supplied asset ID inside the authenticated project. We then
  // persist the trusted storage URL, never a caller-controlled URL.
  const asset = await db.mediaAsset.findFirst({
    where: { id: input.assetRef, projectId: project.id },
    select: { id: true, url: true },
  });
  if (!asset) return NextResponse.json({ error: "Owned media asset not found" }, { status: 404 });

  const existing = await db.youTubePublish.findUnique({ where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: input.idempotencyKey } }, select: { id: true, status: true } });
  if (existing) return NextResponse.json({ publishId: existing.id, status: existing.status, duplicate: true });

  try {
    const result = await db.$transaction(async (tx) => {
      const publish = await tx.youTubePublish.create({
        data: {
          userId: user.id,
          projectId: project.id,
          idempotencyKey: input.idempotencyKey,
          title: input.title,
          description: input.description,
          tagsJson: input.tags ? JSON.stringify(input.tags) : null,
          privacyStatus: input.privacyStatus,
          assetRef: asset.url,
        },
      });
      const job = await tx.job.create({
        data: {
          userId: user.id,
          projectId: project.id,
          type: "YOUTUBE_PUBLISH",
          payload: JSON.stringify({ publishId: publish.id }),
        },
      });
      return { publish, job };
    });

    await audit({ userId: user.id, action: "YOUTUBE_PUBLISH_REQUESTED", resource: "YOUTUBE_PUBLISH", resourceId: result.publish.id, metadata: { jobId: result.job.id, privacyStatus: input.privacyStatus, assetId: asset.id } });
    return NextResponse.json({ publishId: result.publish.id, jobId: result.job.id, status: result.publish.status }, { status: 202 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      const raced = await db.youTubePublish.findUnique({ where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: input.idempotencyKey } }, select: { id: true, status: true } });
      if (raced) return NextResponse.json({ publishId: raced.id, status: raced.status, duplicate: true });
    }
    await audit({ userId: user.id, action: "YOUTUBE_PUBLISH_REQUESTED", resource: "YOUTUBE_PUBLISH", success: false });
    return NextResponse.json({ error: "Unable to queue publish" }, { status: 500 });
  }
}
