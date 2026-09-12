import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

export async function GET() {
  const user = await requireAuth();
  const rows = await db.socialConnection.findMany({where:{userId:user.id,provider:{in:["FACEBOOK","INSTAGRAM"]}},select:{id: true,provider:true,accountId:true,accountName:true,expiresAt:true,updatedAt:true}});
  return NextResponse.json({connections:rows});
}
