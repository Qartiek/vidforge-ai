import {NextResponse} from "next/server";
import {sanitizeTopic} from "../../../lib/security";
export async function GET(){return NextResponse.json({projects:[],message:"Database adapter ready to be connected."});}
export async function POST(request:Request){const body=await request.json().catch(()=>null);const topic=typeof body?.topic==="string"?sanitizeTopic(body.topic):"";if(!topic)return NextResponse.json({error:"A valid topic is required"},{status:400});return NextResponse.json({id:crypto.randomUUID(),topic,title:topic.slice(0,80),status:"queued",creditsRequired:1,pipeline:["research","hook","script","voice","visuals","edit","thumbnail","seo","publish"]},{status:201});}
