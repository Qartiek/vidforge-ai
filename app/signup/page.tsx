"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || "Unable to create your account. Please try again.");
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
          <h1 className="auth-title">
            Your studio.
            <br />
            <span className="auth-gradient">Powered by AI.</span>
          </h1>
          <p className="auth-subtitle">
            Turn one idea into research, hook-led scripts, visuals, voiceovers,
            edited videos, SEO and platform-ready content.
          </p>
        </section>

        <form className="auth-card" onSubmit={submit}>
          <h2>Create your account</h2>
          <p className="auth-muted">Start building with VidForge AI.</p>

          <label className="auth-label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />

          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="auth-input"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="auth-input"
            required
            minLength={8}
            maxLength={128}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <small className="auth-note">Minimum 8 characters.</small>

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create account →"}
          </button>

          <p className="auth-switch">
            Already have an account?{" "}
            <a className="auth-link" href="/login">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
