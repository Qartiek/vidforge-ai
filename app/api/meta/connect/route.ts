import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { requireAuth } from "../../../../lib/auth";

export async function GET() {
  const user = await requireAuth();
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !redirectUri) return NextResponse.json({ error: "Meta OAuth is not configured" }, { status: 503 });
  const state = crypto.randomBytes(32).toString("base64url");
  const name = process.env.NODE_ENV === "production" ? "__Host-novyn_meta_oauth_state" : "novyn_meta_oauth_state";
  (await cookies()).set(name, `${user.id}.${state}`, { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", maxAge:600 });
  const params = new URLSearchParams({ client_id:appId, redirect_uri:redirectUri, response_type:"code", state, scope:"public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish" });
  return NextResponse.redirect(`https://www.facebook.com/v23.0/dialog/oauth?${params}`);
}
