import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      topic: true,
      assets: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, url: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ projects });
}
