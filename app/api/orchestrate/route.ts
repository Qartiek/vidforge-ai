import {NextResponse} from "next/server";
import {getSessionUser} from "../../../lib/auth";
import {rateLimit} from "../../../lib/rate-limit";
import {buildAgentSystemPrompt,createOrchestrationPlan} from "../../../lib/ai-orchestrator";

export async function POST(request:Request){
  const user=await getSessionUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const limited=await rateLimit(`orchestrate:${user.id}`,20,3600);
  if(!limited.allowed)return NextResponse.json({error:"Rate limit exceeded"},{status:429});
  const body=await request.json().catch(()=>null);
  const mode=body?.mode||"full_auto";
  if(!["youtube","shortform","repurpose","full_auto"].includes(mode))return NextResponse.json({error:"Invalid mode"},{status:400});
  return NextResponse.json({ok:true,plan:createOrchestrationPlan(mode),system:buildAgentSystemPrompt()});
}
