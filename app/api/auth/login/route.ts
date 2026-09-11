import { NextResponse } from "next/server";
import { loginUser, createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function databaseError(error: unknown) {
  const code = (error as { code?: string })?.code;
  return ["P1001", "P1002", "P1017", "P2021", "P2022"].includes(code ?? "") ||
    (error instanceof Error && /DATABASE_URL|Can't reach database|database server/i.test(error.message));
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = await request.json().catch(() => null);
  if (typeof body?.email !== "string" || typeof body?.password !== "string") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: noStore });
  }

  const email = body.email.trim().toLowerCase();
  if (!email || body.password.length < 8 || body.password.length > 128) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: noStore });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured for this deployment. Add the production DATABASE_URL in Vercel and redeploy." },
      { status: 503, headers: noStore },
    );
  }

  try {
    const [ipRl, emailRl] = await Promise.all([
      rateLimit(`login:ip:${ip}`, 10, 900),
      rateLimit(`login:email:${email}`, 10, 900),
    ]);
    if (!ipRl.allowed || !emailRl.allowed) {
      return NextResponse.json({ error: "Too many login attempts" }, { status: 429, headers: noStore });
    }

    const user = await loginUser(email, body.password);
    await createSession(user);
    try { await audit({ userId: user.id, action: "AUTH_LOGIN", resource: "USER", resourceId: user.id, ip }); } catch {}
    return NextResponse.json({ ok: true, user }, { headers: noStore });
  } catch (error) {
    console.error("AUTH_LOGIN_FAILED", error);
    try { await audit({ action: "AUTH_LOGIN_FAILED", resource: "AUTH", success: false, ip }); } catch {}
    if (databaseError(error)) {
      return NextResponse.json(
        { error: "Database is unavailable. Check the production DATABASE_URL and redeploy." },
        { status: 503, headers: noStore },
      );
    }
    return NextResponse.json({ error: "Unable to sign in right now. Please check your account and try again." }, { status: 401, headers: noStore });
  }
}
