import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { audit } from "../../../../../lib/audit";
import { getValidYouTubeAccessToken, uploadYouTubeVideo } from "../../../../../lib/youtube";
import { materializeVideoAsset, removeMaterializedAsset } from "../../../../../lib/asset-storage";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.JOB_WORKER_SECRET;
  const supplied = request.headers.get("authorization");
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { jobId?: string } | null;
  if (!body?.jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  const job = await db.job.findUnique({ where: { id: body.jobId } });
  if (!job || job.type !== "YOUTUBE_PUBLISH") return NextResponse.json({ error: "YouTube publish job not found" }, { status: 404 });
  if (job.status === "RUNNING" || job.status === "SUCCEEDED") return NextResponse.json({ status: job.status }, { status: 200 });
  if (job.attempts >= 5) return NextResponse.json({ error: "Retry limit reached", status: job.status }, { status: 409 });

  const claimed = await db.job.updateMany({ where: { id: job.id, status: "QUEUED", attempts: job.attempts }, data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date(), error: null } });
  if (claimed.count !== 1) return NextResponse.json({ status: "RUNNING" }, { status: 409 });

  let file: string | undefined;
  try {
    const payload = JSON.parse(job.payload) as { publishId?: string };
    if (!payload.publishId) throw new Error("Invalid YouTube publish job payload");
    const publish = await db.youTubePublish.findFirst({ where: { id: payload.publishId, userId: job.userId } });
    if (!publish) throw new Error("Publish record not found");
    if (publish.status === "PUBLISHED") { await db.job.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date() } }); return NextResponse.json({ status: "PUBLISHED", publishId: publish.id, youtubeVideoId: publish.youtubeVideoId }); }

    await db.youTubePublish.update({ where: { id: publish.id }, data: { status: "UPLOADING", error: null } });
    const access = await getValidYouTubeAccessToken(job.userId);
    const asset = await materializeVideoAsset(publish.assetRef, publish.id);
    file = asset.file;
    const tags = publish.tagsJson ? JSON.parse(publish.tagsJson) as string[] : [];
    const videoId = await uploadYouTubeVideo(access.accessToken, { file, title: publish.title, description: publish.description, tags, privacyStatus: publish.privacyStatus });
    await db.youTubePublish.update({ where: { id: publish.id }, data: { status: "PUBLISHED", youtubeVideoId: videoId, publishedAt: new Date(), error: null } });
    await db.job.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), error: null } });
    await audit({ userId: job.userId, action: "YOUTUBE_PUBLISHED", resource: "YOUTUBE_PUBLISH", resourceId: publish.id, metadata: JSON.stringify({ videoId }) });
    return NextResponse.json({ status: "PUBLISHED", publishId: publish.id, youtubeVideoId: videoId }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube upload failed";
    const retryable = job.attempts + 1 < 5;
    await db.youTubePublish.updateMany({ where: { id: JSON.parse(job.payload).publishId, userId: job.userId }, data: { status: "FAILED", error: message.slice(0, 1000) } });
    await db.job.update({ where: { id: job.id }, data: { status: retryable ? "QUEUED" : "FAILED", finishedAt: retryable ? null : new Date(), error: message.slice(0, 1000) } });
    await audit({ userId: job.userId, action: "YOUTUBE_PUBLISH_FAILED", resource: "YOUTUBE_PUBLISH", success: false, resourceId: JSON.parse(job.payload).publishId });
    return NextResponse.json({ error: "YouTube upload failed", retryable, attempts: job.attempts + 1 }, { status: retryable ? 503 : 500 });
  } finally { if (file) await removeMaterializedAsset(file).catch(() => undefined); }
}
