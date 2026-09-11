import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "operational",
    version: "0.5.0",
    features: [
      "research",
      "content-generation",
      "voice-synthesis",
      "image-generation",
      "video-rendering",
      "youtube-publishing",
      "analytics",
    ],
  });
}
