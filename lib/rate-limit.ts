import { db } from "./db";

// Durable DB-backed fixed-window limiter. Safe across multiple app instances.
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const bucket = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const id = `${key}:${bucket.getTime()}`;
  const row = await db.rateLimit.upsert({ where: { id }, create: { id, key, bucket, count: 1 }, update: { count: { increment: 1 } } });
  return { allowed: row.count <= limit, remaining: Math.max(0, limit - row.count), resetAt: new Date(bucket.getTime() + windowSeconds * 1000) };
}
