import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { nextAutomationRun } from "../../../../../lib/autopilot-config";
import { runAutoPilotRun } from "../../../../../lib/autopilot-runner";
export const runtime = "nodejs";
function authorized(request: Request) { const expected = process.env.CRON_SECRET; return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`); }
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const profiles = await db.automationProfile.findMany({ where: { enabled: true, nextRunAt: { lte: now } }, take: 10 });
  let created = 0, succeeded = 0, failed = 0;
  for (const profile of profiles) {
    const existing = await db.automationRun.findFirst({ where: { profileId: profile.id, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
    if (existing) continue;
    const run = await db.automationRun.create({ data: { userId: profile.userId, profileId: profile.id, status: "QUEUED" } });
    await db.automationProfile.update({ where: { id: profile.id }, data: { lastRunAt: now, nextRunAt: nextAutomationRun(now, profile.cadence as "daily" | "weekly" | "biweekly", profile.publishHourUtc) } });
    created++;
    try {
      await db.automationRun.update({ where: { id: run.id }, data: { status: "RUNNING", startedAt: new Date() } });
      await runAutoPilotRun(run.id);
      await db.automationRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), error: null } });
      succeeded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "AutoPilot run failed";
      await db.automationRun.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: message.slice(0, 1000) } });
      failed++;
    }
  }
  return NextResponse.json({ ok: true, dueProfiles: profiles.length, runsCreated: created, succeeded, failed });
}
