import {NextResponse} from "next/server";
import {getSessionUser} from "../../../../lib/auth";
import {db} from "../../../../lib/db";
import {buildProductionPlan} from "../../../../lib/production";
import {rateLimit} from "../../../../lib/rate-limit";
export async function POST(request:Request){
 const user=await getSessionUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const rl=await rateLimit("production-prepare:"+user.id,5,3600); if(!rl.allowed)return NextResponse.json({error:"Production rate limit exceeded"},{status:429});
 const body=await request.json().catch(()=>null); if(typeof body?.projectId!=="string")return NextResponse.json({error:"projectId required"},{status:400});
 const project=await db.project.findFirst({where:{id:body.projectId,userId:user.id},include:{scripts:true}}); const script=project?.scripts[0]; if(!project||!script)return NextResponse.json({error:"Project or script not found"},{status:404});
 let brief:{platform?:string;format?:string;durationMode?:"auto"|"manual";durationMinutes?:number}={}; const generation=await db.job.findFirst({where:{projectId:project.id,userId:user.id,type:"content_generation"},orderBy:{createdAt:"desc"}}); if(generation)try{brief=(JSON.parse(generation.payload) as {brief?:typeof brief}).brief||{};}catch{}
 const plan=buildProductionPlan(script.script,{platform:brief.platform,format:brief.format,durationMode:brief.durationMode,durationSeconds:typeof brief.durationMinutes==="number"?brief.durationMinutes*60:undefined});
 const job=await db.job.create({data:{userId:user.id,projectId:project.id,type:"media_production",status:"QUEUED",payload:JSON.stringify({plan,scriptId:script.id,brief})}});
 await db.project.update({where:{id:project.id},data:{status:"PRODUCING"}}); await db.auditLog.create({data:{userId:user.id,action:"MEDIA_PRODUCTION_QUEUED",resource:"Job",resourceId:job.id,success:true,metadata:JSON.stringify({durationSeconds:plan.durationSeconds})}});
 return NextResponse.json({jobId:job.id,plan},{status:202});
}
