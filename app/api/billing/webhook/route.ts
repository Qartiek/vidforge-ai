import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "../../../../../lib/db";
import { audit } from "../../../../../lib/audit";
import { getStripe } from "../../../../../lib/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const existing = await db.auditLog.findFirst({ where: { action: "STRIPE_WEBHOOK", resourceId: event.id } });
  if (existing) return NextResponse.json({ received: true, duplicate: true });

  try {
    const data = event.data.object as Stripe.Subscription | Stripe.Checkout.Session;
    const metadata = data.metadata ?? {};
    const userId = metadata.userId;
    const plan = metadata.plan as "STARTER" | "PRO" | "BUSINESS" | undefined;

    if (userId && plan && ["STARTER", "PRO", "BUSINESS"].includes(plan)) {
      if (event.type === "checkout.session.completed" || event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
        await db.user.update({ where: { id: userId }, data: { plan } });
      } else if (event.type === "customer.subscription.deleted") {
        await db.user.update({ where: { id: userId }, data: { plan: "FREE" } });
      }
    }

    await audit({ userId: userId ?? undefined, action: "STRIPE_WEBHOOK", resource: event.type, resourceId: event.id, success: true });
    return NextResponse.json({ received: true });
  } catch {
    await audit({ action: "STRIPE_WEBHOOK", resource: event.type, resourceId: event.id, success: false });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
