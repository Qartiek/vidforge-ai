import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
export const runtime = "nodejs";
export async function GET() {
  const user = await getSessionUser(); if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const items = await db.contentCalendar.findMany({ where: { userId: user.id }, orderBy: { scheduledAt: "asc" }, take: 100 });
  return NextResponse.json({ items });
}
export async function POST(request: Request) {
  const user = await getSessionUser(); if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : ""; const topic = typeof body?.topic === "string" ? body.topic.trim() : null;
  const scheduledAt = typeof body?.scheduledAt === "string" ? new Date(body.scheduledAt) : null; const notes = typeof body?.notes === "string" ? body.notes.trim() : null;
  if (!title || !scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) return NextResponse.json({ error: "title and a future scheduledAt are required" }, { status: 400 });
  const projectId = typeof body?.projectId === "string" ? body.projectId : null;
  if (projectId) { const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } }); if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 }); }
  const item = await db.contentCalendar.create({ data: { userId: user.id, projectId, scheduledAt, title, topic, notes } });
  return NextResponse.json({ ok: true, item });
}
