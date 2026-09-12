import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { DEFAULT_AUTOPILOT_CONFIG, nextAutomationRun } from "../../../lib/autopilot-config";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const profile = await db.automationProfile.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ profile: profile ?? null, defaults: DEFAULT_AUTOPILOT_CONFIG });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const niche = typeof body?.niche === "string" ? body.niche.trim() : "";
  const audience = typeof body?.audience === "string" ? body.audience.trim() : "";
  const language = typeof body?.language === "string" && body.language.trim() ? body.language.trim() : "English";
  const cadence = body?.cadence === "daily" || body?.cadence === "weekly" || body?.cadence === "biweekly" ? body.cadence : "weekly";
  const publishHourUtc = Math.max(0, Math.min(23, Number(body?.publishHourUtc ?? 12)));
  const videosPerRun = Math.max(1, Math.min(3, Number(body?.videosPerRun ?? 1)));
  const enabled = body?.enabled === true;
  const autoPublish = body?.autoPublish === true;
  const privacyStatus = body?.privacyStatus === "public" || body?.privacyStatus === "unlisted" ? body.privacyStatus : "private";
  if (!niche || !audience) return NextResponse.json({ error: "niche and audience are required" }, { status: 400 });
  const nextRunAt = enabled ? nextAutomationRun(new Date(), cadence, publishHourUtc) : null;
  const existing = await db.automationProfile.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  const data = { enabled, niche, audience, language, cadence, publishHourUtc, videosPerRun, autoPublish, privacyStatus, nextRunAt };
  const profile = existing ? await db.automationProfile.update({ where: { id: existing.id }, data }) : await db.automationProfile.create({ data: { ...data, userId: user.id } });
  await db.auditLog.create({ data: { userId: user.id, action: "AUTOPILOT_CONFIGURED", resource: "AutomationProfile", resourceId: profile.id, metadata: JSON.stringify({ enabled, cadence, videosPerRun, autoPublish }) } });
  return NextResponse.json({ ok: true, profile });
}
