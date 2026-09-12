import {NextResponse} from "next/server";
import {z} from "zod";
import {getSessionUser} from "../../../../lib/auth";
import {db} from "../../../../lib/db";
import {buildProductionPlan} from "../../../../lib/production";
import {rateLimit} from "../../../../lib/rate-limit";
const schema=z.object({projectId:z.string().min(1).max(100)});
export async function POST(request:Request){
 const user=await getSessionUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const rl=await rateLimit(`production:${user.id}`,10,3600); if(!rl.allowed)return NextResponse.json({error:"Production rate limit exceeded"},{status:429});
 const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:"Invalid project request"},{status:400});
 const project=await db.project.findFirst({where:{id:parsed.data.projectId,userId:user.id},include:{scripts:true}}); const script=project?.scripts[0]; if(!project)return NextResponse.json({error:"Project not found"},{status:404}); if(!script)return NextResponse.json({error:"Generate the hook and script first"},{status:400});
 const existing=await db.job.findFirst({where:{userId:user.id,projectId:project.id,type:"production",status:{in:["QUEUED","RUNNING"]}},orderBy:{createdAt:"desc"}}); if(existing)return NextResponse.json({jobId:existing.id,status:existing.status.toLowerCase(),message:"Production plan already queued"},{status:202});
 let brief:{platform?:string;format?:string;durationMode?:"auto"|"manual";durationMinutes?:number}={}; const generation=await db.job.findFirst({where:{projectId:project.id,userId:user.id,type:"content_generation"},orderBy:{createdAt:"desc"}}); if(generation)try{brief=(JSON.parse(generation.payload) as {brief?:typeof brief}).brief||{};}catch{}
 const plan=buildProductionPlan(script.script,{platform:brief.platform,format:brief.format,durationMode:brief.durationMode,durationSeconds:typeof brief.durationMinutes==="number"?brief.durationMinutes*60:undefined});
 const job=await db.job.create({data:{userId:user.id,projectId:project.id,type:"production",status:"QUEUED",payload:JSON.stringify({plan,scriptId:script.id,brief})}});
 await db.project.update({where:{id:project.id},data:{status:"PRODUCING"}}); await db.auditLog.create({data:{userId:user.id,action:"PRODUCTION_PLANNED",resource:"Job",resourceId:job.id,success:true,metadata:JSON.stringify({durationSeconds:plan.durationSeconds,sceneCount:plan.scenes.length})}});
 return NextResponse.json({jobId:job.id,plan,status:"queued"},{status:202});
}
