"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      const r = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase() }), cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Unable to send reset email right now."); return; }
      setMessage(d.message || "If an account exists for that email, a password reset link has been sent.");
    } catch { setError("Connection failed. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-page"><div className="auth-shell">
      <section className="auth-copy"><div className="auth-brand">VIDFORGE AI · GEN 7</div><h1 className="auth-title">Reset.<br /><span className="auth-gradient">Securely.</span><br />Continue.</h1><p className="auth-subtitle">We’ll send a secure password-reset link to your email address.</p></section>
      <form className="auth-card" onSubmit={submit}>
        <h2>Forgot password?</h2><p className="auth-muted">Enter the email used for your VidForge account.</p>
        <label className="auth-label" htmlFor="email">Email</label>
        <input id="email" className="auth-input" required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="auth-muted" role="status">{message}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? "Sending…" : "Send reset link →"}</button>
        <p className="auth-switch"><Link className="auth-link" href="/login">← Back to sign in</Link></p>
      </form>
    </div></main>
  );
}
