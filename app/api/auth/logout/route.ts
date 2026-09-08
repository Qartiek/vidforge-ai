import { NextResponse } from "next/server";
import { clearSession, getSessionUser } from "../../../../lib/auth";
import { audit } from "../../../../lib/audit";
export async function POST(request: Request) { const user = await getSessionUser(); await clearSession(); if (user) await audit({ userId: user.id, action: "AUTH_LOGOUT", resource: "USER", resourceId: user.id, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() }); return NextResponse.json({ ok: true }); }
