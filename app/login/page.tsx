"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        cache: "no-store",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || "Unable to sign in. Check your details and try again.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Connection failed. Please check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-copy">
          <div className="auth-brand">VIDFORGE AI · GEN 7</div>
          <h1 className="auth-title">Create.<br /><span className="auth-gradient">Automate.</span><br />Publish.</h1>
          <p className="auth-subtitle">Your AI workspace for research, scripts, thumbnails, voiceovers, editing, SEO and multi-platform content automation.</p>
        </section>
        <form className="auth-card" onSubmit={submit}>
          <h2>Welcome back</h2>
          <p className="auth-muted">Sign in to your VidForge workspace.</p>
          <label className="auth-label" htmlFor="email">Email</label>
          <input id="email" className="auth-input" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          <label className="auth-label" htmlFor="password">Password</label>
          <input id="password" className="auth-input" required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in →"}</button>
          <p className="auth-switch">New to VidForge? <a className="auth-link" href="/signup">Create account</a></p>
        </form>
      </div>
    </main>
  );
}
