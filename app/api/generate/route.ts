import {NextResponse} from "next/server";
import {getSessionUser} from "../../../lib/auth";
import {rateLimit} from "../../../lib/rate-limit";
import {db} from "../../../lib/db";
import {generateJson} from "../../../lib/ai";
import {buildContentPrompt,type ContentBrief,type GeneratedContent} from "../../../lib/content-engine";
export async function POST(request:Request){
 const user=await getSessionUser();
 if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const rl=await rateLimit("generate:"+user.id,10,3600);
 if(!rl.allowed)return NextResponse.json({error:"Rate limit exceeded",resetAt:rl.resetAt},{status:429});
 const body=await request.json().catch(()=>null);
 if(typeof body?.topic!=="string"||!body.topic.trim())return NextResponse.json({error:"topic is required"},{status:400});
 const brief:ContentBrief={topic:body.topic.trim().slice(0,500),audience:typeof body.audience==="string"?body.audience.slice(0,160):"general audience",durationMinutes:Math.min(Math.max(Number(body.durationMinutes)||8,1),30),tone:typeof body.tone==="string"?body.tone.slice(0,80):"engaging",language:typeof body.language==="string"?body.language.slice(0,40):"English",platform:typeof body.platform==="string"?body.platform.slice(0,40):"YouTube",format:typeof body.format==="string"?body.format.slice(0,40):"long-form video"};
 try{
  const content=await generateJson<GeneratedContent>(buildContentPrompt(brief),JSON.stringify(brief));
  const project=await db.project.create({data:{userId:user.id,title:content.title.slice(0,180),topic:brief.topic,status:"COMPLETE"}});
  await db.contentScript.create({data:{projectId:project.id,hook:content.hook,title:content.title,script:content.script,seoTitle:content.seoTitle,description:content.description,tagsJson:JSON.stringify(content.tags)}});
  const job=await db.job.create({data:{userId:user.id,projectId:project.id,type:"content_generation",status:"SUCCEEDED",payload:JSON.stringify({brief,content}),startedAt:new Date(),finishedAt:new Date()}});
  await db.auditLog.create({data:{userId:user.id,action:"CONTENT_GENERATED",resource:"Project",resourceId:project.id,success:true,metadata:JSON.stringify({jobId:job.id,platform:brief.platform,format:brief.format})}});
  return NextResponse.json({projectId:project.id,jobId:job.id,status:"complete",brief,content});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Generation failed"},{status:500});}
}
