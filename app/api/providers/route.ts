import {NextResponse} from "next/server";
import {getSessionUser} from "../../../lib/auth";
import {db} from "../../../lib/db";
import {providerConfigured} from "../../../lib/providers/secrets";

export async function GET(){
 const user=await getSessionUser();
 const social=user?await db.socialConnection.findMany({where:{userId:user.id,provider:{in:["FACEBOOK","INSTAGRAM"]}},select:{provider: true,accountName:true,accountId:true}}):[];
 const has=(provider:"FACEBOOK"|"INSTAGRAM")=>social.some(x=>x.provider===provider);
 return NextResponse.json({providers:{openai:{configured:providerConfigured("openai")},anthropic:{configured:providerConfigured("anthropic")},google:{configured:providerConfigured("google")},youtube:{configured:Boolean(process.env.YOUTUBE_CLIENT_ID&&process.env.YOUTUBE_CLIENT_SECRET)},instagram:{configured:Boolean((process.env.META_APP_ID||process.env.FACEBOOK_APP_ID)&&(process.env.META_APP_SECRET||process.env.FACEBOOK_APP_SECRET)),connected:has("INSTAGRAM")},facebook:{configured:Boolean((process.env.META_APP_ID||process.env.FACEBOOK_APP_ID)&&(process.env.META_APP_SECRET||process.env.FACEBOOK_APP_SECRET)),connected:has("FACEBOOK")}},note:"Provider secrets are server-side only."});
}
