import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "../../../../../lib/auth";
import { audit } from "../../../../../lib/audit";
import { getStripe, getStripePriceId } from "../../../../../lib/stripe";

const schema = z.object({
  plan: z.enum(["STARTER", "PRO", "BUSINESS"]),
});

export async function POST(request: Request) {
  const user = await requireAuth();
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid billing plan" }, { status: 400 });

  const appUrl = process.env.APP_URL;
  if (!appUrl) return NextResponse.json({ error: "Application URL is not configured" }, { status: 503 });

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
    return NextResponse.json({ url: session.url });
  } catch {
    await audit({ userId: user.id, action: "BILLING_CHECKOUT_CREATED", resource: "STRIPE", success: false });
    return NextResponse.json({ error: "Unable to create billing checkout" }, { status: 502 });
  }
}
