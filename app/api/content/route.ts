import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rate-limit";
import { buildContentPrompt } from "../../../lib/content-engine";

function autoTargetMinutes(platform:string,format:string){const p=platform.toLowerCase(),f=format.toLowerCase();if(p.includes("instagram")||p.includes("tiktok")||f.includes("short")||f.includes("reel"))return 1;if(f.includes("long")||f.includes("documentary")||f.includes("explainer"))return 8;return 5;}
export async function POST(request:Request){
 const user=await getSessionUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const rl=await rateLimit(`content-blueprint:${user.id}`,30,3600); if(!rl.allowed)return NextResponse.json({error:"Content blueprint rate limit exceeded",resetAt:rl.resetAt},{status:429});
 const body=await request.json().catch(()=>null); if(typeof body?.topic!=="string"||!body.topic.trim())return NextResponse.json({error:"topic is required"},{status:400});
 const platform=typeof body.platform==="string"?body.platform.slice(0,50):"YouTube"; const format=typeof body.format==="string"?body.format.slice(0,50):"Long-form video"; const durationMode=body.durationMode==="manual"?"manual":"auto"; const requested=Number(body.durationMinutes); const durationMinutes=durationMode==="manual"&&Number.isFinite(requested)?Math.min(Math.max(requested,0.25),60):autoTargetMinutes(platform,format);
 const brief={topic:body.topic.trim().slice(0,500),audience:typeof body.audience==="string"?body.audience.slice(0,200):"general audience",durationMinutes,tone:typeof body.tone==="string"?body.tone.slice(0,80):"clear and engaging",language:typeof body.language==="string"?body.language.slice(0,40):"English",platform,format};
 return NextResponse.json({jobId:crypto.randomUUID(),status:"content_blueprint_ready",brief,durationMode,workflow:["research","strategy","script_with_hook","title_thumbnail","voiceover","visuals","editing","captions","seo","shorts_reels","quality_check","schedule_publish","analytics_optimize"],prompt:buildContentPrompt(brief)},{status:202});
}
