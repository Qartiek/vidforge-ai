import { redirect } from "next/navigation";
import { getSessionUser } from "../../lib/auth";

const modules = [
  ["01", "Research Engine", "Topics, trends, angles, sources and evidence.", "/research"],
  ["02", "Hook + Script", "Hook-first retention structure, script and rewrites.", "/create"],
  ["03", "Viral Packaging", "CTR scoring, title/thumbnail pairing, SEO, tags and publish gate.", "/packaging"],
  ["04", "Production", "Voice, visuals, captions, editing and render pipeline.", "/production"],
  ["05", "SEO + Repurpose", "YouTube metadata plus Shorts, Reels and social variants.", "/content"],
  ["06", "Publish + Schedule", "Quality gate, YouTube upload and scheduled publishing.", "/production"],
  ["07", "Analytics", "Performance signals and optimization loop.", "/production"],
  ["08", "Providers", "AI, storage, rendering and publishing integrations.", "/providers"],
];

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <main className="container dashboard-page">
    <nav className="nav"><a href="/dashboard" className="logo" style={{textDecoration:"none"}}>NOVYN</a><div className="nav-actions"><span className="status-dot"/> COMMAND CENTER <span className="muted">{user.name || user.email}</span><a className="nav-link" href="/jobs">Jobs</a><a className="nav-link" href="/pricing">Plans</a></div></nav>
    <section className="studio-hero dashboard-hero"><span className="badge">✦ AUTONOMOUS CONTENT OPERATING SYSTEM</span><h1 className="section-title">Your <span className="gradient-text">creative command center.</span></h1><p className="studio-subtitle">Turn one idea into a complete, publish-ready content operation — with every AI production stage connected in one workspace.</p><div className="dashboard-actions"><a className="cta" href="/create">Create with AI →</a><a className="cta secondary-cta" href="/packaging">Open Viral Lab</a></div></section>
    <section className="workspace dashboard-workspace"><div className="workspace-head"><div><span className="eyebrow">AI WORKFLOW</span><h2>Production modules</h2></div><span className="live-pill"><span/> System ready</span></div><div className="grid">{modules.map(([number,title,description,href])=><a key={title} href={href} className="card dashboard-card" style={{textDecoration:"none",display:"block"}}><span className="badge">{number}</span><h3>{title}</h3><p className="muted">{description}</p><span className="module-link">Open module →</span></a>)}</div></section>
    <section className="pipeline-panel dashboard-pipeline"><div className="workspace-head"><div><span className="eyebrow">DEFAULT AUTOPILOT</span><h2>Recommended flow</h2></div><strong>14 stages</strong></div><div className="pipeline-steps">{["Idea","Research","Angle","Hook + Script","Title + Thumbnail","Voice","Visuals","Editing","Captions","SEO","Repurpose","Quality","Schedule + Publish","Analytics"].map((x,i)=><span className="pipeline-step" key={x}>{i+1}. {x}</span>)}</div><p className="hint">Full Auto can run the workflow in the background. Publishing stays behind an explicit quality/approval gate unless an administrator intentionally enables autonomous publishing.</p></section>
  </main>;
}
