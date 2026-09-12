import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { nextAutomationRun } from "../../../../../lib/autopilot-config";
export const runtime = "nodejs";
function authorized(request: Request) { const expected = process.env.CRON_SECRET; return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`); }
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const profiles = await db.automationProfile.findMany({ where: { enabled: true, nextRunAt: { lte: now } }, take: 20 });
  let created = 0;
  for (const profile of profiles) {
    const existing = await db.automationRun.findFirst({ where: { profileId: profile.id, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
    if (existing) continue;
    await db.automationRun.create({ data: { userId: profile.userId, profileId: profile.id, status: "QUEUED" } });
    await db.automationProfile.update({ where: { id: profile.id }, data: { lastRunAt: now, nextRunAt: nextAutomationRun(now, profile.cadence as "daily" | "weekly" | "biweekly", profile.publishHourUtc) } });
    created++;
  }
  return NextResponse.json({ ok: true, dueProfiles: profiles.length, runsCreated: created });
}
