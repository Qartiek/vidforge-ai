import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export function getStripe() {
  if (!secretKey) throw new Error("Stripe is not configured");
  return new Stripe(secretKey);
}

export function getStripePriceId(plan: "STARTER" | "PRO" | "BUSINESS") {
  const key = `STRIPE_PRICE_${plan}` as const;
  const priceId = process.env[key];
  if (!priceId) throw new Error(`Stripe price is not configured for ${plan}`);
  return priceId;
}
