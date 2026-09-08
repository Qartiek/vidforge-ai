import { db } from "./db";
import { decryptSecret, encryptSecret } from "./crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function getValidYouTubeAccessToken(userId: string) {
  const connection = await db.youTubeConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("YouTube is not connected");

  const now = Date.now();
  if (connection.accessToken && connection.expiresAt && connection.expiresAt.getTime() > now + 60_000) {
    return { accessToken: decryptSecret(connection.accessToken), connection };
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("YouTube OAuth is not configured");

  const refreshToken = decryptSecret(connection.refreshToken);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      const body = await response.text().catch(() => "");
      if (body.includes("invalid_grant") || body.includes("invalid_token")) {
        await db.youTubeConnection.delete({ where: { userId } }).catch(() => undefined);
        throw new Error("YouTube authorization expired; reconnect required");
      }
    }
    throw new Error("Unable to refresh YouTube authorization");
  }

  const token = await response.json() as { access_token?: string; expires_in?: number; scope?: string };
  if (!token.access_token) throw new Error("YouTube refresh returned no access token");

  const updated = await db.youTubeConnection.update({
    where: { userId },
    data: {
      accessToken: encryptSecret(token.access_token),
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : new Date(Date.now() + 3_000_000),
      ...(token.scope ? { scope: token.scope } : {}),
    },
  });

  return { accessToken: token.access_token, connection: updated };
}
