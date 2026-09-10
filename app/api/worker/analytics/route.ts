import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { audit } from "../../../../lib/audit";
import { createOptimizationRecommendations, fetchYouTubeAnalytics } from "../../../../lib/youtube-analytics";

export const runtime = "nodejs";
const MAX_ATTEMPTS = 5;
const STALE_AFTER_MS = 60 * 60 * 1000;
function authorized(request: Request) { const expected = process.env.JOB_WORKER_SECRET; return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`); }

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { jobId?: string } | null;
  if (!body?.jobId || body.jobId.length > 128) return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  const job = await db.job.findUnique({ where: { id: body.jobId } });
  if (!job || job.type !== "ANALYTICS_OPTIMIZATION") return NextResponse.json({ error: "Analytics job not found" }, { status: 404 });
  if (job.status === "SUCCEEDED") return NextResponse.json({ status: "SUCCEEDED", jobId: job.id });
  if (job.status === "RUNNING") {
    if (!job.startedAt || Date.now() - job.startedAt.getTime() < STALE_AFTER_MS) return NextResponse.json({ status: "RUNNING" }, { status: 409 });
    const recovered = await db.job.updateMany({ where: { id: job.id, status: "RUNNING", startedAt: job.startedAt }, data: { status: "QUEUED", finishedAt: null, error: "Stale worker lease recovered" } });
    if (recovered.count !== 1) return NextResponse.json({ status: "RUNNING" }, { status: 409 });
  }
  if (job.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Retry limit reached", status: job.status }, { status: 409 });
  const claimed = await db.job.updateMany({ where: { id: job.id, status: "QUEUED", attempts: job.attempts }, data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date(), error: null } });
  if (claimed.count !== 1) return NextResponse.json({ status: "RUNNING" }, { status: 409 });
  try {
    const payload = JSON.parse(job.payload) as { publishId?: string; videoId?: string };
    if (!payload.publishId || !payload.videoId) throw new Error("Invalid analytics job payload");
    const publish = await db.youTubePublish.findFirst({ where: { id: payload.publishId, userId: job.userId } });
    if (!publish || publish.status !== "PUBLISHED" || publish.youtubeVideoId !== payload.videoId) throw new Error("Published YouTube video not found");
    const snapshot = await fetchYouTubeAnalytics(job.userId, payload.videoId);
    const recommendations = createOptimizationRecommendations(snapshot);
    const row = await db.youTubeAnalytics.create({ data: { userId: job.userId, projectId: job.projectId, publishId: publish.id, youtubeVideoId: snapshot.videoId, views: snapshot.views, likes: snapshot.likes, comments: snapshot.comments, watchTimeMinutes: snapshot.watchTimeMinutes, averageViewDurationSeconds: snapshot.averageViewDurationSeconds, averageViewPercentage: snapshot.averageViewPercentage, recommendationsJson: JSON.stringify(recommendations) } });
    await db.job.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), error: null, payload: JSON.stringify({ ...payload, analyticsId: row.id, snapshot, recommendations }) } });
    if (job.projectId) await db.project.update({ where: { id: job.projectId }, data: { status: "COMPLETE" } });
    await audit({ userId: job.userId, action: "YOUTUBE_ANALYTICS_CAPTURED", resource: "YOUTUBE_ANALYTICS", resourceId: row.id, metadata: { videoId: payload.videoId, views: snapshot.views } });
    return NextResponse.json({ status: "SUCCEEDED", analyticsId: row.id, snapshot, recommendations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics collection failed";
    const retryable = job.attempts < MAX_ATTEMPTS;
    await db.job.update({ where: { id: job.id }, data: { status: retryable ? "QUEUED" : "FAILED", finishedAt: retryable ? null : new Date(), error: message.slice(0, 1000) } });
    await audit({ userId: job.userId, action: "YOUTUBE_ANALYTICS_FAILED", resource: "ANALYTICS_OPTIMIZATION", success: false, resourceId: job.id, metadata: { retryable, error: message } });
    return NextResponse.json({ error: "Analytics collection failed", retryable, attempts: job.attempts }, { status: retryable ? 503 : 500 });
  }
}
