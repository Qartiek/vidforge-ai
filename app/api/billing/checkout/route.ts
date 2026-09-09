import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthenticationRequiredError, requireAuth } from "../../../../../lib/auth";
import { audit } from "../../../../../lib/audit";
import { rateLimit } from "../../../../../lib/rate-limit";
import { getStripe, getStripePriceId } from "../../../../../lib/stripe";

const schema = z.object({
  plan: z.enum(["STARTER", "PRO", "BUSINESS"]),
});

function responseError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return responseError("Authentication required", 401);
    throw error;
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const [userLimit, ipLimit] = await Promise.all([
    rateLimit(`billing-checkout:user:${user.id}`, 10, 3600),
    rateLimit(`billing-checkout:ip:${ip}`, 30, 3600),
  ]);
  if (!userLimit.allowed || !ipLimit.allowed) return responseError("Too many billing requests", 429);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return responseError("Invalid billing plan", 400);

  const appUrl = process.env.APP_URL;
  if (!appUrl) return responseError("Application URL is not configured", 503);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getStripePriceId(parsed.data.plan), quantity: 1 }],
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/dashboard?billing=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { userId: user.id, plan: parsed.data.plan },
      subscription_data: { metadata: { userId: user.id, plan: parsed.data.plan } },
    });

    await audit({ userId: user.id, action: "BILLING_CHECKOUT_CREATED", resource: "STRIPE", resourceId: session.id, metadata: JSON.stringify({ plan: parsed.data.plan }) });
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    await audit({ userId: user.id, action: "BILLING_CHECKOUT_CREATED", resource: "STRIPE", success: false });
    return responseError("Unable to create billing checkout", 502);
  }
}
