import {NextResponse} from "next/server";
import {getSessionUser} from "../../../lib/auth";
import {rateLimit} from "../../../lib/rate-limit";
import {db} from "../../../lib/db";
import {generateJson} from "../../../lib/ai";
import {buildContentPrompt,type ContentBrief,type GeneratedContent} from "../../../lib/content-engine";

function autoTargetMinutes(platform:string,format:string){const p=platform.toLowerCase(),f=format.toLowerCase();if(p.includes("instagram")||p.includes("tiktok")||f.includes("short")||f.includes("reel"))return 1;if(f.includes("long"))return 8;return 5;}
export async function POST(request:Request){
 const user=await getSessionUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const rl=await rateLimit("generate:"+user.id,10,3600); if(!rl.allowed)return NextResponse.json({error:"Rate limit exceeded",resetAt:rl.resetAt},{status:429});
 const body=await request.json().catch(()=>null); if(typeof body?.topic!=="string"||!body.topic.trim())return NextResponse.json({error:"topic is required"},{status:400});
 const platform=typeof body.platform==="string"?body.platform.slice(0,40):"YouTube"; const format=typeof body.format==="string"?body.format.slice(0,40):"long-form video"; const durationMode=body.durationMode==="manual"?"manual":"auto"; const requested=Number(body.durationMinutes); const durationMinutes=durationMode==="manual"&&Number.isFinite(requested)?Math.min(Math.max(requested,0.25),60):autoTargetMinutes(platform,format);
 const brief:ContentBrief={topic:body.topic.trim().slice(0,500),audience:typeof body.audience==="string"?body.audience.slice(0,160):"general audience",durationMinutes,tone:typeof body.tone==="string"?body.tone.slice(0,80):"engaging",language:typeof body.language==="string"?body.language.slice(0,40):"English",platform,format,researchContext:typeof body.researchContext==="string"?body.researchContext.slice(0,12000):undefined};
 try{const content=await generateJson<GeneratedContent>(buildContentPrompt(brief),JSON.stringify({...brief,durationMode})); const project=await db.project.create({data:{userId:user.id,title:content.title.slice(0,180),topic:brief.topic,status:"QUEUED"}}); const script=await db.contentScript.create({data:{projectId:project.id,hook:content.hook,title:content.title,script:content.script,seoTitle:content.seoTitle,description:content.description,tagsJson:JSON.stringify(content.tags)}}); const job=await db.job.create({data:{userId:user.id,projectId:project.id,type:"content_generation",status:"SUCCEEDED",payload:JSON.stringify({brief,content,durationMode}),startedAt:new Date(),finishedAt:new Date()}}); await db.auditLog.create({data:{userId:user.id,action:"CONTENT_GENERATED",resource:"Project",resourceId:project.id,success:true,metadata:JSON.stringify({jobId:job.id,platform:brief.platform,format:brief.format,durationMode})}}); return NextResponse.json({projectId:project.id,contentScriptId:script.id,jobId:job.id,status:"queued",brief,content,durationMode});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Generation failed"},{status:500});}
}
