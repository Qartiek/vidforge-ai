import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { synthesizeSpeech } from "../../../../lib/tts";
import { rateLimit } from "../../../../lib/rate-limit";
export async function POST(request: Request) {
  const user = await getSessionUser(); if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const rl = await rateLimit(`tts:${user.id}`, 5, 3600); if (!rl.allowed) return NextResponse.json({ error: "Voice generation rate limit exceeded" }, { status: 429 });
  const body = await request.json().catch(() => null); if (typeof body?.projectId !== "string") return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const project = await db.project.findFirst({ where: { id: body.projectId, userId: user.id }, include: { scripts: true } });
  const script = project?.scripts[0]; if (!project || !script) return NextResponse.json({ error: "Project or script not found" }, { status: 404 });
  try {
    const audio = await synthesizeSpeech(script.script);
    return new Response(audio, { status: 200, headers: { "content-type": "audio/mpeg", "cache-control": "no-store", "content-disposition": 'inline; filename="voice.mp3"' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Voice generation failed" }, { status: 502 }); }
}
