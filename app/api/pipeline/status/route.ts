import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "";
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true, status: true, updatedAt: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const jobs = await db.job.findMany({ where: { projectId, userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, type: true, status: true, attempts: true, payload: true, error: true, createdAt: true, startedAt: true, finishedAt: true } });
  return NextResponse.json({ ok: true, project, jobs });
}
