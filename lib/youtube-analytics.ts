import { db } from "./db";
import { getValidYouTubeAccessToken } from "./youtube";

export type YouTubeAnalyticsSnapshot = {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  watchTimeMinutes: number;
  averageViewDurationSeconds: number;
  averageViewPercentage: number;
  fetchedAt: string;
};

async function youtubeRequest(accessToken: string, url: string) {
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!response.ok) throw new Error(`YouTube Analytics request failed (${response.status})`);
  return response.json() as Promise<{ rows?: unknown[][] }>;
}

export async function fetchYouTubeAnalytics(userId: string, videoId: string): Promise<YouTubeAnalyticsSnapshot> {
  if (!videoId) throw new Error("YouTube video ID is required for analytics");
  const { accessToken } = await getValidYouTubeAccessToken(userId);
  const params = new URLSearchParams({ ids: "channel==MINE", startDate: "2000-01-01", endDate: new Date().toISOString().slice(0, 10), metrics: "views,likes,comments,estimatedMinutesWatched,averageViewDuration,averageViewPercentage", dimensions: "video", filters: `video==${videoId}` });
  const data = await youtubeRequest(accessToken, `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`);
  const row = data.rows?.[0];
  if (!row) throw new Error("YouTube Analytics returned no metrics for this video yet");
  const values = row.map(Number);
  return { videoId, views: values[0] || 0, likes: values[1] || 0, comments: values[2] || 0, watchTimeMinutes: values[3] || 0, averageViewDurationSeconds: values[4] || 0, averageViewPercentage: values[5] || 0, fetchedAt: new Date().toISOString() };
}

export function createOptimizationRecommendations(snapshot: YouTubeAnalyticsSnapshot) {
  const recommendations: string[] = [];
  const engagementRate = snapshot.views > 0 ? ((snapshot.likes + snapshot.comments) / snapshot.views) * 100 : 0;
  if (snapshot.averageViewPercentage > 0 && snapshot.averageViewPercentage < 35) recommendations.push("Retention is weak: tighten the opening, remove slow sections, and add stronger pattern interrupts earlier.");
  else if (snapshot.averageViewPercentage >= 50) recommendations.push("Retention is healthy: preserve the current pacing and opening structure in the next iteration.");
  if (engagementRate < 1) recommendations.push("Engagement is low: use a clearer CTA and invite a specific viewer response rather than a generic like/comment request.");
  if (snapshot.averageViewDurationSeconds > 0 && snapshot.views > 0) recommendations.push("Use the observed average view duration as the baseline when deciding the next video's target length.");
  if (!recommendations.length) recommendations.push("Collect more post-publication data before making a strong optimization change.");
  return recommendations;
}

export async function recordAnalyticsJob(userId: string, projectId: string | null, publishId: string, videoId: string) {
  const candidates = await db.job.findMany({ where: { userId, projectId: projectId ?? undefined, type: "ANALYTICS_OPTIMIZATION", status: { in: ["QUEUED", "RUNNING", "SUCCEEDED"] } }, orderBy: { createdAt: "desc" }, take: 20 });
  const existing = candidates.find((job) => { try { return JSON.parse(job.payload).publishId === publishId; } catch { return false; } });
  if (existing) return existing;
  return db.job.create({ data: { userId, projectId, type: "ANALYTICS_OPTIMIZATION", status: "QUEUED", payload: JSON.stringify({ publishId, videoId, provider: "youtube-analytics-api" }) } });
}
