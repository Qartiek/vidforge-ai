import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser, createSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/rate-limit";
import { audit } from "../../../../lib/audit";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const [ipRl, emailRl] = await Promise.all([
      rateLimit(`register:ip:${ip}`, 5, 3600),
      rateLimit(`register:email:${email}`, 3, 3600),
    ]);

    if (!ipRl.allowed || !emailRl.allowed) {
      return NextResponse.json({ error: "Too many signup attempts. Please try again later." }, { status: 429 });
    }

    let user;
    try {
      user = await registerUser(email, parsed.data.password, parsed.data.name);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json({ error: "This email is already registered. Please sign in instead." }, { status: 409 });
      }
      throw error;
    }

    await createSession(user);
    void audit({ userId: user.id, action: "AUTH_REGISTER", resource: "USER", resourceId: user.id, ip });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("AUTH_REGISTER_FAILED", error);
    void audit({
      action: "AUTH_REGISTER_FAILED",
      resource: "AUTH",
      success: false,
      ip,
      metadata: { code: (error as { code?: string })?.code ?? "UNKNOWN" },
    });
    return NextResponse.json({ error: "Signup service is temporarily unavailable. Please try again in a moment." }, { status: 503 });
  }
}
