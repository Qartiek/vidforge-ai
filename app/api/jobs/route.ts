import {NextResponse} from "next/server";
import {createJob} from "../../../lib/jobs";
export async function POST(request:Request){const body=await request.json().catch(()=>null);const allowed=["research","content","voice","visuals","render","thumbnail","seo","publish"];if(!allowed.includes(body?.type))return NextResponse.json({error:"invalid job type"},{status:400});return NextResponse.json(createJob(body.type),{status:202});}
