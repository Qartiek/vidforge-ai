import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser, createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

function databaseError(error: unknown) {
  const code = (error as { code?: string })?.code;
  return ["P1001", "P1002", "P1017", "P2021", "P2022"].includes(code ?? "") ||
    (error instanceof Error && /DATABASE_URL|Can't reach database|database server/i.test(error.message));
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email and a password of at least 8 characters." },
      { status: 400, headers: noStore },
    );
  }

  const email = parsed.data.email.toLowerCase();

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured for this deployment. Add the production DATABASE_URL in Vercel and redeploy." },
      { status: 503, headers: noStore },
    );
  }

  try {
    const [ipRl, emailRl] = await Promise.all([
      rateLimit(`register:ip:${ip}`, 5, 3600),
      rateLimit(`register:email:${email}`, 3, 3600),
    ]);

    if (!ipRl.allowed || !emailRl.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429, headers: noStore },
      );
    }

    let user;
    try {
      user = await registerUser(email, parsed.data.password, parsed.data.name);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json(
          { error: "This email is already registered. Please sign in instead." },
          { status: 409, headers: noStore },
        );
      }
      throw error;
    }

    await createSession(user);
    void audit({ userId: user.id, action: "AUTH_REGISTER", resource: "USER", resourceId: user.id, ip });

    return NextResponse.json({ user }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("AUTH_REGISTER_FAILED", error);
    void audit({
      action: "AUTH_REGISTER_FAILED",
      resource: "AUTH",
      success: false,
      ip,
      metadata: { code: (error as { code?: string })?.code ?? "UNKNOWN" },
    });

    if (databaseError(error)) {
      return NextResponse.json(
        { error: "Database is unavailable. Check the production DATABASE_URL and redeploy." },
        { status: 503, headers: noStore },
      );
    }

    return NextResponse.json(
      { error: "Unable to create your account right now. Please try again." },
      { status: 503, headers: noStore },
    );
  }
}
