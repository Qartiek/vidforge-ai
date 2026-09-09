import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { buildRenderManifest } from "../../../../lib/render";
import { rateLimit } from "../../../../lib/rate-limit";
export async function POST(request: Request) {
  const user = await getSessionUser(); if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const rl = await rateLimit("render:" + user.id, 3, 3600); if (!rl.allowed) return NextResponse.json({ error: "Render rate limit exceeded" }, { status: 429 });
  const body = await request.json().catch(() => null); if (typeof body?.projectId !== "string") return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const project = await db.project.findFirst({ where: { id: body.projectId, userId: user.id }, include: { scripts: true, assets: true } });
  const script = project?.scripts[0];
  if (!project || !script) return NextResponse.json({ error: "Project or script not found" }, { status: 404 });
  const assets = project.assets.filter((a) => a.type === "image" || a.type === "video"); if (!assets.length) return NextResponse.json({ error: "No visual assets acquired" }, { status: 400 });
  const duration = Math.max(30, Math.round(script.script.split(/\s+/).filter(Boolean).length / 2.4));
  const manifest = buildRenderManifest(duration, assets);
  const job = await db.job.create({ data: { userId: user.id, projectId: project.id, type: "ffmpeg_render", status: "QUEUED", payload: JSON.stringify({ manifest, scriptId: script.id }) } });
  await db.project.update({ where: { id: project.id }, data: { status: "PRODUCING" } });
  await db.auditLog.create({ data: { userId: user.id, action: "FFMPEG_RENDER_QUEUED", resource: "Job", resourceId: job.id, success: true, metadata: JSON.stringify({ sceneCount: manifest.scenes.length }) } });
  return NextResponse.json({ jobId: job.id, manifest, status: "queued" }, { status: 202 });
}
