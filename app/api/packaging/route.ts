import { NextResponse } from "next/server";
import { z } from "zod";
import { generateViralPackaging } from "../../../lib/viral-packaging";

const schema = z.object({
  topic: z.string().trim().min(3).max(500),
  audience: z.string().max(200).optional(),
  language: z.string().max(60).optional(),
  niche: z.string().max(100).optional(),
  goal: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const result = await generateViralPackaging(body);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Packaging engine failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
