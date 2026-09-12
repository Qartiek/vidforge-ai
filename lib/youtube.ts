import { db } from "./db";
import { decryptSecret, encryptSecret } from "./crypto";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_MAX_TITLE = 100;
const YOUTUBE_MAX_DESCRIPTION_BYTES = 5000;
const YOUTUBE_MAX_TAGS = 500;
const ALLOWED_PRIVACY = new Set(["private", "public", "unlisted"]);
function utf8Bytes(value: string) { return new TextEncoder().encode(value).byteLength; }
function validateYouTubeMetadata(input: { title: string; description?: string | null; tags?: string[]; privacyStatus: string; scheduledAt?: Date | null }) {
  const title = input.title.trim(); const description = input.description?.trim() ?? ""; const tags = input.tags ?? [];
  if (!title || title.length > YOUTUBE_MAX_TITLE) throw new Error("YouTube title must be between 1 and 100 characters");
  if (utf8Bytes(description) > YOUTUBE_MAX_DESCRIPTION_BYTES) throw new Error("YouTube description exceeds the 5000-byte limit");
  if (!Array.isArray(tags) || tags.length > 500) throw new Error("YouTube tags list is invalid or too large");
  const normalizedTags = tags.map((tag) => String(tag).trim()).filter(Boolean);
  if (normalizedTags.reduce((total, tag) => total + utf8Bytes(tag), 0) > YOUTUBE_MAX_TAGS) throw new Error("YouTube tags exceed the 500-byte limit");
  if (!ALLOWED_PRIVACY.has(input.privacyStatus)) throw new Error("Invalid YouTube privacy status");
  if (input.scheduledAt && input.scheduledAt.getTime() <= Date.now()) throw new Error("YouTube scheduled publish time must be in the future");
  if (input.scheduledAt && input.privacyStatus !== "private") throw new Error("Scheduled YouTube videos must remain private until publish time");
  return { title, description, tags: normalizedTags };
}
export async function getValidYouTubeAccessToken(userId: string) {
  const connection = await db.youTubeConnection.findUnique({ where: { userId } }); if (!connection) throw new Error("YouTube is not connected");
  if (connection.accessToken && connection.expiresAt && connection.expiresAt.getTime() > Date.now() + 60000) return { accessToken: decryptSecret(connection.accessToken), connection };
  const clientId = process.env.YOUTUBE_CLIENT_ID; const clientSecret = process.env.YOUTUBE_CLIENT_SECRET; if (!clientId || !clientSecret) throw new Error("YouTube OAuth is not configured");
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: decryptSecret(connection.refreshToken), grant_type: "refresh_token" }), signal: AbortSignal.timeout(8000) });
  if (!response.ok) { if (response.status === 400 || response.status === 401) { const body = await response.text().catch(() => ""); if (body.includes("invalid_grant") || body.includes("invalid_token")) { await db.youTubeConnection.delete({ where: { userId } }).catch(() => undefined); throw new Error("YouTube authorization expired; reconnect required"); } } throw new Error("Unable to refresh YouTube authorization"); }
  const token = await response.json() as { access_token?: string; expires_in?: number; scope?: string }; if (!token.access_token) throw new Error("YouTube refresh returned no access token");
  const updated = await db.youTubeConnection.update({ where: { userId }, data: { accessToken: encryptSecret(token.access_token), expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : new Date(Date.now() + 3000000), ...(token.scope ? { scope: token.scope } : {}) } });
  return { accessToken: token.access_token, connection: updated };
}
export async function uploadYouTubeVideo(accessToken: string, input: { file: string; title: string; description?: string | null; tags?: string[]; privacyStatus: string; scheduledAt?: Date | null }) {
  const metadata = validateYouTubeMetadata(input); const fs = await import("node:fs/promises"); const stat = await fs.stat(input.file); if (stat.size <= 0) throw new Error("Video asset is empty");
  const status: { privacyStatus: string; publishAt?: string } = { privacyStatus: input.privacyStatus }; if (input.scheduledAt) { status.privacyStatus = "private"; status.publishAt = input.scheduledAt.toISOString(); }
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "video/mp4", "x-upload-content-length": String(stat.size) }, body: JSON.stringify({ snippet: { title: metadata.title, description: metadata.description, tags: metadata.tags }, status }), signal: AbortSignal.timeout(15000) });
  if (!init.ok) throw new Error(`YouTube upload initialization failed (${init.status})`); const location = init.headers.get("location"); if (!location) throw new Error("YouTube did not return an upload URL");
  const handle = await fs.open(input.file, "r"); try { const chunkSize = 8 * 1024 * 1024; let offset = 0; while (offset < stat.size) { const end = Math.min(offset + chunkSize, stat.size) - 1; const length = end - offset + 1; const chunk = Buffer.allocUnsafe(length); await handle.read(chunk, 0, length, offset); const r = await fetch(location, { method: "PUT", headers: { authorization: `Bearer ${accessToken}`, "content-type": "video/mp4", "content-length": String(length), "content-range": `bytes ${offset}-${end}/${stat.size}` }, body: chunk, signal: AbortSignal.timeout(120000) }); if (r.status === 308) { const confirmed = r.headers.get("range")?.match(/-(\d+)$/)?.[1]; offset = confirmed ? Number(confirmed) + 1 : end + 1; continue; } if (!r.ok) throw new Error(`YouTube video upload failed (${r.status})`); const result = await r.json() as { id?: string }; if (!result.id) throw new Error("YouTube upload completed without video ID"); return result.id; } } finally { await handle.close(); } throw new Error("YouTube upload ended without a video ID");
}
