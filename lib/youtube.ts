import { db } from "./db";
import { decryptSecret, encryptSecret } from "./crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function getValidYouTubeAccessToken(userId: string) {
  const connection = await db.youTubeConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("YouTube is not connected");
  const now = Date.now();
  if (connection.accessToken && connection.expiresAt && connection.expiresAt.getTime() > now + 60_000) return { accessToken: decryptSecret(connection.accessToken), connection };
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("YouTube OAuth is not configured");
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: decryptSecret(connection.refreshToken), grant_type: "refresh_token" }), signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) { const body = await response.text().catch(() => ""); if (body.includes("invalid_grant") || body.includes("invalid_token")) { await db.youTubeConnection.delete({ where: { userId } }).catch(() => undefined); throw new Error("YouTube authorization expired; reconnect required"); } }
    throw new Error("Unable to refresh YouTube authorization");
  }
  const token = await response.json() as { access_token?: string; expires_in?: number; scope?: string };
  if (!token.access_token) throw new Error("YouTube refresh returned no access token");
  const updated = await db.youTubeConnection.update({ where: { userId }, data: { accessToken: encryptSecret(token.access_token), expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : new Date(Date.now() + 3_000_000), ...(token.scope ? { scope: token.scope } : {}) } });
  return { accessToken: token.access_token, connection: updated };
}

export async function uploadYouTubeVideo(accessToken: string, input: { file: string; title: string; description?: string | null; tags?: string[]; privacyStatus: string }) {
  const fs = await import("node:fs/promises");
  const stat = await fs.stat(input.file);
  if (stat.size <= 0) throw new Error("Video asset is empty");
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "video/mp4", "x-upload-content-length": String(stat.size) }, body: JSON.stringify({ snippet: { title: input.title, description: input.description ?? "", tags: input.tags?.slice(0, 500) ?? [] }, status: { privacyStatus: input.privacyStatus } }), signal: AbortSignal.timeout(15000) });
  if (!init.ok) throw new Error(`YouTube upload initialization failed (${init.status})`);
  const location = init.headers.get("location");
  if (!location) throw new Error("YouTube did not return an upload URL");
  const handle = await fs.open(input.file, "r");
  try {
    const chunkSize = 8 * 1024 * 1024;
    let offset = 0;
    while (offset < stat.size) {
      const end = Math.min(offset + chunkSize, stat.size) - 1;
      const length = end - offset + 1;
      const chunk = Buffer.allocUnsafe(length);
      await handle.read(chunk, 0, length, offset);
      const r = await fetch(location, { method: "PUT", headers: { authorization: `Bearer ${accessToken}`, "content-type": "video/mp4", "content-length": String(length), "content-range": `bytes ${offset}-${end}/${stat.size}` }, body: chunk, signal: AbortSignal.timeout(120000) });
      if (r.status === 308) { const confirmed = r.headers.get("range")?.match(/-(\d+)$/)?.[1]; offset = confirmed ? Number(confirmed) + 1 : end + 1; continue; }
      if (!r.ok) throw new Error(`YouTube video upload failed (${r.status})`);
      const result = await r.json() as { id?: string };
      if (!result.id) throw new Error("YouTube upload completed without video ID");
      return result.id;
    }
  } finally { await handle.close(); }
  throw new Error("YouTube upload ended without a video ID");
}
