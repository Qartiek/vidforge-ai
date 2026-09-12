import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);

  if (!databaseConfigured) {
    return NextResponse.json(
      {
        ok: false,
        service: "vidforge-ai",
        status: "degraded",
        version: "0.5.0",
        checks: { databaseConfigured: false, databaseReachable: false },
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: noStore },
    );
  }

  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        ok: true,
        service: "vidforge-ai",
        status: "ready",
        version: "0.5.0",
        checks: { databaseConfigured: true, databaseReachable: true },
        features: [
          "research",
          "content-generation",
          "voice-synthesis",
          "image-generation",
          "video-rendering",
          "youtube-publishing",
          "analytics",
        ],
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: noStore },
    );
  } catch (error) {
    console.error("HEALTH_STATUS_DATABASE_FAILED", error);
    return NextResponse.json(
      {
        ok: false,
        service: "vidforge-ai",
        status: "degraded",
        version: "0.5.0",
        checks: { databaseConfigured: true, databaseReachable: false },
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: noStore },
    );
  }
}
