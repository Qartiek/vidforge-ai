import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
export async function GET() {
  const user = await requireAuth(); const connection = await db.youTubeConnection.findUnique({ where: { userId: user.id }, select: { channelId: true, channelTitle: true, expiresAt: true, scope: true } });
  return NextResponse.json({ connected: Boolean(connection), channelId: connection?.channelId ?? null, channelTitle: connection?.channelTitle ?? null, expiresAt: connection?.expiresAt?.toISOString() ?? null, scope: connection?.scope ?? null });
}
