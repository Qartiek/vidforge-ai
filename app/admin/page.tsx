import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { assertAdmin } from "../../lib/authz";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  try {
    assertAdmin(user.role);
  } catch {
    redirect("/dashboard");
  }

  const [users, projects, videosGenerated, published] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.job.count({ where: { type: "render", status: "SUCCEEDED" } }),
    db.youTubePublish.count({ where: { status: "PUBLISHED" } }),
  ]);

  const metrics = [
    ["Users", String(users)],
    ["Active Projects", String(projects)],
    ["Videos Generated", String(videosGenerated)],
    ["Published", String(published)],
  ];

  return (
    <main className="container">
      <nav className="nav">
        <div className="logo">VidForge AI <span className="muted">Admin</span></div>
      </nav>
      <section style={{ padding: "45px 0" }}>
        <span className="badge">SUPER ADMIN</span>
        <h1 style={{ fontSize: 42 }}>Control Center</h1>
        <p className="muted">Live production metrics and operational controls.</p>
        <div className="grid">
          {metrics.map(([label, value]) => (
            <article className="card" key={label}>
              <p className="muted">{label}</p>
              <h2>{value}</h2>
            </article>
          ))}
        </div>
        <div className="grid">
          <article className="card"><h3>AI Providers</h3><p className="muted">Model configuration, usage and cost controls.</p></article>
          <article className="card"><h3>Users & Billing</h3><p className="muted">Plans, credits, subscriptions and account controls.</p></article>
          <article className="card"><h3>Automation Jobs</h3><p className="muted">Queue, status, retries and production monitoring.</p></article>
        </div>
      </section>
    </main>
  );
}
