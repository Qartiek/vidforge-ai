import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "../../../../../lib/db";
import { audit } from "../../../../../lib/audit";
import { getStripe } from "../../../../../lib/stripe";

const VALID_PLANS = new Set(["STARTER", "PRO", "BUSINESS"]);
const BILLING_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

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

  if (!BILLING_EVENTS.has(event.type)) return NextResponse.json({ received: true, ignored: true });

  try {
    const data = event.data.object as Stripe.Subscription | Stripe.Checkout.Session;
    const metadata = data.metadata ?? {};
    const userId = metadata.userId;
    const plan = metadata.plan;

    if (!userId || !plan || !VALID_PLANS.has(plan)) {
      await audit({ action: "STRIPE_WEBHOOK", resource: event.type, resourceId: event.id, success: false, metadata: JSON.stringify({ reason: "invalid_metadata" }) });
      return NextResponse.json({ error: "Invalid webhook metadata" }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.auditLog.findFirst({
        where: { action: "STRIPE_WEBHOOK", resourceId: event.id },
        select: { id: true },
      });
      if (existing) return "duplicate" as const;

      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw new Error("Stripe webhook user not found");

      const nextPlan = event.type === "customer.subscription.deleted" ? "FREE" : plan;
      await tx.user.update({ where: { id: userId }, data: { plan: nextPlan } });
      await tx.auditLog.create({
        data: { userId, action: "STRIPE_WEBHOOK", resource: event.type, resourceId: event.id, success: true },
      });
      return "processed" as const;
    });

    return NextResponse.json({ received: true, ...(result === "duplicate" ? { duplicate: true } : {}) });
  } catch {
    await audit({ action: "STRIPE_WEBHOOK", resource: event.type, resourceId: event.id, success: false });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
