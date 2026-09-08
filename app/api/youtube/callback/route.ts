import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { requireAuth } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { encryptSecret } from "../../../../../lib/crypto";
import { audit } from "../../../../../lib/audit";

export async function GET(request: Request) {
  const user = await requireAuth();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("youtube_oauth_state")?.value;
  cookieStore.delete("youtube_oauth_state");
  if (!code || !returnedState || !storedState) return NextResponse.json({ error: "Invalid OAuth callback" }, { status: 400 });
  const [stateUserId, state] = storedState.split(".");
  if (stateUserId !== user.id || !state || !safeEqual(state, returnedState)) return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return NextResponse.json({ error: "YouTube OAuth is not configured" }, { status: 503 });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
  if (!tokenResponse.ok) { await audit({ userId: user.id, action: "YOUTUBE_OAUTH_CALLBACK", resource: "YOUTUBE", success: false }); return NextResponse.json({ error: "YouTube authorization failed" }, { status: 502 }); }
  const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
  if (!token.access_token || !token.refresh_token) return NextResponse.json({ error: "YouTube did not return required tokens" }, { status: 400 });

  const channelResponse = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!channelResponse.ok) return NextResponse.json({ error: "Unable to read YouTube channel" }, { status: 502 });
  const channelData = await channelResponse.json() as { items?: Array<{ id?: string; snippet?: { title?: string } }> };
  const channel = channelData.items?.[0];
  if (!channel?.id) return NextResponse.json({ error: "No YouTube channel found" }, { status: 400 });

  await db.youTubeConnection.upsert({ where: { userId: user.id }, create: { userId: user.id, channelId: channel.id, channelTitle: channel.snippet?.title, accessToken: encryptSecret(token.access_token), refreshToken: encryptSecret(token.refresh_token), expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, scope: token.scope }, update: { channelId: channel.id, channelTitle: channel.snippet?.title, accessToken: encryptSecret(token.access_token), refreshToken: encryptSecret(token.refresh_token), expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, scope: token.scope } });
  await audit({ userId: user.id, action: "YOUTUBE_OAUTH_CONNECTED", resource: "YOUTUBE", resourceId: channel.id, metadata: JSON.stringify({ channelTitle: channel.snippet?.title }) });
  return NextResponse.redirect(new URL("/dashboard?youtube=connected", request.url));
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
