import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { decryptSecret } from "../../../../../lib/crypto";
import { audit } from "../../../../../lib/audit";

export async function POST() {
  const user = await requireAuth();
  const connection = await db.youTubeConnection.findUnique({ where: { userId: user.id } });
  if (!connection) return NextResponse.json({ connected: false });

  let revokeOk = true;
  try {
    const token = decryptSecret(connection.refreshToken);
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(8000),
    });
    revokeOk = response.ok;
  } catch {
    revokeOk = false;
  }

  await db.youTubeConnection.delete({ where: { userId: user.id } });
  await audit({ userId: user.id, action: "YOUTUBE_DISCONNECTED", resource: "YOUTUBE", resourceId: connection.channelId ?? undefined, success: revokeOk, metadata: JSON.stringify({ revoked: revokeOk }) });

  return NextResponse.json({ connected: false, revoked: revokeOk });
}
