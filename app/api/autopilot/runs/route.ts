import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
export const runtime = "nodejs";
export async function GET() {
  const user = await getSessionUser(); if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const runs = await db.automationRun.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { profile: { select: { name: true, niche: true, cadence: true } } } });
  return NextResponse.json({ runs });
}
export async function POST() {
  const user = await getSessionUser(); if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const profile = await db.automationProfile.findFirst({ where: { userId: user.id, enabled: true }, orderBy: { createdAt: "asc" } });
  if (!profile) return NextResponse.json({ error: "AutoPilot is not enabled" }, { status: 409 });
  const run = await db.automationRun.create({ data: { userId: user.id, profileId: profile.id, status: "QUEUED" } });
  return NextResponse.json({ ok: true, runId: run.id, status: run.status });
}
