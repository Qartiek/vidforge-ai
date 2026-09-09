import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Plan, Prisma } from "@prisma/client";
import { db } from "../../../../lib/db";
import { audit } from "../../../../lib/audit";
import { getStripe } from "../../../../lib/stripe";

const VALID_PLANS = new Set<Plan>([Plan.STARTER, Plan.PRO, Plan.BUSINESS]);
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
    const requestedPlan = metadata.plan;

    if (!userId || !requestedPlan || !VALID_PLANS.has(requestedPlan as Plan)) {
      await audit({
        action: "STRIPE_WEBHOOK",
        resource: event.type,
        resourceId: event.id,
        success: false,
        metadata: { reason: "invalid_metadata" },
      });
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

      const nextPlan: Plan = event.type === "customer.subscription.deleted" ? Plan.FREE : requestedPlan as Plan;
      await tx.user.update({ where: { id: userId }, data: { plan: nextPlan } });
      await tx.auditLog.create({
        data: {
          userId,
          action: "STRIPE_WEBHOOK",
          resource: event.type,
          resourceId: event.id,
          success: true,
        },
      });
      return "processed" as const;
    });

    return NextResponse.json({ received: true, ...(result === "duplicate" ? { duplicate: true } : {}) });
  } catch (error) {
    // Two concurrent deliveries can both pass the pre-check; the database
    // unique constraint makes the audit insert the serialization point.
    // Treat that race as an already-processed Stripe event so Stripe does not
    // unnecessarily retry a webhook that has already been applied.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await audit({ action: "STRIPE_WEBHOOK", resource: event.type, resourceId: event.id, success: false }).catch(() => undefined);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
