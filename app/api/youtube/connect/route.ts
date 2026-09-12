import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { requireAuth } from "../../../../lib/auth";
import { audit } from "../../../../lib/audit";

export async function GET(request: Request) {
  const user = await requireAuth();
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  if (!clientId || !redirectUri) return NextResponse.json({ error: "YouTube OAuth is not configured" }, { status: 503 });

  const state = crypto.randomBytes(32).toString("base64url");
  const stateCookie = process.env.NODE_ENV === "production" ? "__Host-vidforge_youtube_oauth_state" : "vidforge_youtube_oauth_state";
  (await cookies()).set(stateCookie, `${user.id}.${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    state,
  });

  await audit({ userId: user.id, action: "YOUTUBE_OAUTH_START", resource: "YOUTUBE", success: true });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
