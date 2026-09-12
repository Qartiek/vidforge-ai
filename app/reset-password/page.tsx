"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPassword() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!token) { setError("This reset link is missing or invalid."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password.length > 128) { setError("Password is too long."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }), cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "This reset link is invalid or expired."); return; }
      router.replace("/login?reset=success");
    } catch { setError("Connection failed. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-page"><div className="auth-shell">
      <section className="auth-copy"><div className="auth-brand">VIDFORGE AI · GEN 7</div><h1 className="auth-title">New.<br /><span className="auth-gradient">Password.</span><br />Fresh Start.</h1><p className="auth-subtitle">Choose a strong new password. Your existing sessions will be signed out for security.</p></section>
      <form className="auth-card" onSubmit={submit}>
        <h2>Set new password</h2><p className="auth-muted">Use 8–128 characters.</p>
        <label className="auth-label" htmlFor="password">New password</label>
        <input id="password" className="auth-input" required minLength={8} maxLength={128} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
        <label className="auth-label" htmlFor="confirm">Confirm password</label>
        <input id="confirm" className="auth-input" required minLength={8} maxLength={128} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? "Updating…" : "Update password →"}</button>
        <p className="auth-switch"><Link className="auth-link" href="/login">Back to sign in</Link></p>
      </form>
    </div></main>
  );
}
