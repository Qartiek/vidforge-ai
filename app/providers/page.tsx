"use client";

import { useEffect, useState } from "react";

type ProviderState = Record<string, { configured?: boolean }>;

export default function Providers() {
  const [data, setData] = useState<{ providers?: ProviderState }>();

  useEffect(() => {
    fetch("/api/providers", { cache: "no-store" })
      .then((response) => response.json())
      .then(setData)
      .catch(() => setData(undefined));
  }, []);

  return (
    <main className="container">
      <nav className="nav">
        <div className="logo">VidForge AI</div>
        <span className="muted">AI Providers</span>
      </nav>
      <section style={{ padding: "45px 0" }}>
        <span className="badge">PROVIDER CONTROL</span>
        <h1 style={{ fontSize: 42 }}>AI provider layer</h1>
        <p className="muted">
          Keys remain server-side. Provider availability can be checked without exposing secrets.
        </p>
        <div className="grid">
          {["openai", "anthropic", "google"].map((provider) => (
            <article className="card" key={provider}>
              <h3>{provider}</h3>
              <p className="muted">
                {data?.providers?.[provider]?.configured ? "Configured" : "Not configured"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
