import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAuth } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { encryptSecret } from "../../../../lib/crypto";

const GRAPH = "https://graph.facebook.com/v23.0";

async function graph(path:string, params:Record<string,string>) {
  const url = new URL(`${GRAPH}${path}`);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const r = await fetch(url,{cache:"no-store"});
  const data = await r.json().catch(()=>null);
  if (!r.ok || data?.error) throw new Error(data?.error?.message || `Meta API error (${r.status})`);
  return data;
}

export async function GET(request:Request) {
  const user = await requireAuth();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  const cookieName = process.env.NODE_ENV === "production" ? "__Host-novyn_meta_oauth_state" : "novyn_meta_oauth_state";
  const stored = (await cookies()).get(cookieName)?.value || "";
  const [stateUserId,state] = stored.split(".");
  if (error) return NextResponse.redirect(new URL(`/providers?meta_error=${encodeURIComponent(error)}`,url.origin));
  if (!code || !returnedState || !state || stateUserId !== user.id || returnedState !== state) return NextResponse.json({error:"Invalid Meta OAuth state"},{status:400});
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) return NextResponse.json({error:"Meta OAuth is not configured"},{status:503});
  try {
    const token = await graph("/oauth/access_token",{client_id:appId,client_secret:appSecret,redirect_uri:redirectUri,code});
    const accounts = await graph("/me/accounts",{access_token:token.access_token,fields:"id,name,access_token,instagram_business_account"});
    const pages = Array.isArray(accounts?.data) ? accounts.data : [];
    if (!pages.length) return NextResponse.redirect(new URL("/providers?meta=connected_no_pages",url.origin));
    for (const page of pages) {
      if (!page?.id || !page?.access_token) continue;
      await db.socialConnection.upsert({where:{userId_provider_accountId:{userId:user.id,provider:"FACEBOOK",accountId:String(page.id)}},create:{userId:user.id,provider:"FACEBOOK",accountId:String(page.id),accountName:String(page.name||"Facebook Page"),accessToken:encryptSecret(String(page.access_token)),scopes:"pages_show_list,pages_read_engagement,pages_manage_posts",metadata:JSON.stringify({source:"meta_oauth"})},update:{accountName:String(page.name||"Facebook Page"),accessToken:encryptSecret(String(page.access_token)),scopes:"pages_show_list,pages_read_engagement,pages_manage_posts",metadata:JSON.stringify({source:"meta_oauth"})}});
      const ig = page.instagram_business_account;
      if (ig?.id) await db.socialConnection.upsert({where:{userId_provider_accountId:{userId:user.id,provider:"INSTAGRAM",accountId:String(ig.id)}},create:{userId:user.id,provider:"INSTAGRAM",accountId:String(ig.id),accountName:`Instagram via ${page.name||"Facebook Page"}`,accessToken:encryptSecret(String(page.access_token)),scopes:"instagram_basic,instagram_content_publish",metadata:JSON.stringify({pageId:String(page.id),pageName:String(page.name||"")})},update:{accountName:`Instagram via ${page.name||"Facebook Page"}`,accessToken:encryptSecret(String(page.access_token)),scopes:"instagram_basic,instagram_content_publish",metadata:JSON.stringify({pageId:String(page.id),pageName:String(page.name||"")})}});
    }
    (await cookies()).delete(cookieName);
    return NextResponse.redirect(new URL("/providers?meta=connected",url.origin));
  } catch (e) {
    return NextResponse.redirect(new URL(`/providers?meta_error=${encodeURIComponent(e instanceof Error?e.message:"Meta connection failed")}`,url.origin));
  }
}
