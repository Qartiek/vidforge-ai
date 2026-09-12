import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

export async function POST(request:Request) {
  const user = await requireAuth();
  const body = await request.json().catch(()=>null);
  const provider = body?.provider === "INSTAGRAM" ? "INSTAGRAM" : body?.provider === "FACEBOOK" ? "FACEBOOK" : null;
  if (!provider) return NextResponse.json({error:"provider must be INSTAGRAM or FACEBOOK"},{status:400});
  await db.socialConnection.deleteMany({where:{userId:user.id,provider}});
  return NextResponse.json({ok:true});
}
