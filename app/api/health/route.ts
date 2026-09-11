import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export const runtime = "nodejs";
const CRON_SECRET = process.env.CRON_SECRET;

function authorized(request: Request) {
  const supplied = request.headers.get("authorization");
  return Boolean(CRON_SECRET && supplied === `Bearer ${CRON_SECRET}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ status: "ok", uptime: process.uptime() });
}
