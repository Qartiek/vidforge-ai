import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const [users, sessions, rateLimits] = await Promise.all([
      db.user.count(),
      db.session.count(),
      db.rateLimit.count(),
    ]);

    return NextResponse.json({
      ok: true,
      database: "connected",
      schema: "ready",
      tables: { users, sessions, rateLimits },
      build: "db-health-v2",
    });
  } catch (error) {
    const e = error as { code?: string; message?: string; name?: string };
    console.error("DB_HEALTH_FAILED", {
      name: e?.name,
      code: e?.code,
      message: e?.message,
    });

    return NextResponse.json(
      {
        ok: false,
        database: "unavailable",
        errorCode: e?.code ?? "UNKNOWN",
        errorName: e?.name ?? "Error",
        build: "db-health-v2",
      },
      { status: 503 },
    );
  }
}
