"use client";
import { useState } from "react";

const plans = [
  { id: "STARTER", name: "Starter", price: "₹299/mo", detail: "5 video generations" },
  { id: "PRO", name: "Pro", price: "₹799/mo", detail: "25 video generations" },
  { id: "BUSINESS", name: "Business", price: "₹1,999/mo", detail: "100 video generations" },
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function checkout(plan: string) {
    setLoading(plan);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.href = "/login?next=/pricing";
        return;
      }
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Billing is temporarily unavailable.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setLoading(null);
    }
  }

  return <main className="container">
    <nav className="nav"><div className="logo">NOVYN</div><a className="cta" href="/dashboard">Dashboard</a></nav>
    <section className="hero"><span className="badge">SIMPLE PRICING</span><h1>Choose your plan.</h1><p>Start small and scale your content production as your channel grows.</p></section>
    {error && <p role="alert" className="muted" style={{ marginBottom: 20 }}>{error}</p>}
    <div className="grid">{plans.map((plan) => <article className="card" key={plan.id}>
      <h2>{plan.name}</h2><h3>{plan.price}</h3><p className="muted">{plan.detail}</p>
      <button className="cta" type="button" onClick={() => checkout(plan.id)} disabled={loading !== null}>
        {loading === plan.id ? "Opening checkout…" : `Choose ${plan.name}`}
      </button>
    </article>)}</div>
  </main>;
}
