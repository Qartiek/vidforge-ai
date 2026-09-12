import { redirect } from "next/navigation";
import { getSessionUser } from "../../lib/auth";
import { db } from "../../lib/db";
import DashboardControls from "./dashboard-controls";
import "./dashboard-ultra.css";

const modules = [
  ["01", "Research Engine", "Topics, trends, angles, sources and evidence.", "/research"],
  ["02", "Hook + Script", "Hook-first retention structure, script and rewrites.", "/create"],
  ["03", "Viral Packaging", "CTR scoring, title/thumbnail pairing, SEO, tags and publish gate.", "/packaging"],
  ["04", "Production", "Voice, visuals, captions, editing and render pipeline.", "/production"],
  ["05", "SEO + Repurpose", "YouTube metadata plus Shorts, Reels and social variants.", "/content"],
  ["06", "Publish + Schedule", "Quality gate, YouTube upload and scheduled publishing.", "/schedule"],
  ["07", "Analytics", "Performance signals and optimization loop.", "/production"],
  ["08", "Providers", "AI, storage, rendering and publishing integrations.", "/providers"],
];

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const latestProject = await db.project.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true } });
  return <main className="container dashboard-page">
    <nav className="nav"><a href="/dashboard" className="logo" style={{textDecoration:"none"}}>NOVYN</a><div className="nav-actions"><span className="status-dot"/> COMMAND CENTER <span className="muted">{user.name || user.email}</span><a className="nav-link" href="/jobs">Jobs</a><a className="nav-link" href="/pricing">Plans</a><a className="nav-link" href="/settings">Settings</a></div></nav>
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar" aria-label="NOVYN navigation"><div className="sidebar-title">WORKSPACE</div><a className="sidebar-link active" href="/dashboard">⌂ <span>Dashboard</span></a><a className="sidebar-link" href="/create">✦ <span>Create Video</span></a><a className="sidebar-link" href="/production">▣ <span>My Videos</span></a><a className="sidebar-link" href="/templates">◇ <span>Templates</span></a><a className="sidebar-link" href="/research">⌕ <span>Research</span></a><a className="sidebar-link" href="/packaging">◈ <span>Viral Packaging</span></a><a className="sidebar-link" href="/production">◉ <span>Production</span></a><a className="sidebar-link" href="/schedule">◷ <span>Schedule</span></a><a className="sidebar-link" href="/production">⌁ <span>Analytics</span></a><a className="sidebar-link" href="/providers">⚡ <span>Integrations</span></a><div className="sidebar-divider"/><div className="sidebar-title">SYSTEM</div><a className="sidebar-link settings-link" href="/settings">⚙ <span>All Settings</span></a><a className="sidebar-link" href="/pricing">◇ <span>Billing & Usage</span></a><div className="sidebar-status"><span className="status-dot"/><div><strong>System operational</strong><small>All core services online</small></div></div></aside>
      <div className="dashboard-content"><section className="studio-hero dashboard-hero"><span className="badge">✦ AUTONOMOUS CONTENT OPERATING SYSTEM</span><h1 className="section-title">Your <span className="gradient-text">creative command center.</span></h1><p className="studio-subtitle">Turn one idea into a complete, publish-ready content operation — with every AI production stage connected in one workspace.</p><div className="dashboard-actions"><a className="cta" href="/create">Create with AI →</a><a className="cta secondary-cta" href="/packaging">Open Viral Lab</a></div></section>
      <DashboardControls projectId={latestProject?.id ?? null}/><section className="workspace dashboard-workspace"><div className="workspace-head"><div><span className="eyebrow">AI WORKFLOW</span><h2>Production modules</h2></div><span className="live-pill"><span/> System ready</span></div><div className="grid">{modules.map(([number,title,description,href])=><a key={title} href={href} className="card dashboard-card" style={{textDecoration:"none",display:"block"}}><span className="badge">{number}</span><h3>{title}</h3><p className="muted">{description}</p><span className="module-link">Open module →</span></a>)}</div></section>
      <section id="settings" className="workspace settings-panel"><div className="workspace-head"><div><span className="eyebrow">SYSTEM CONTROL</span><h2>All NOVYN settings</h2></div><a className="live-pill" href="/settings"><span/> Open Settings →</a></div><div className="settings-grid">{[["Profile","Account, name and preferences"],["Appearance","Theme, density and interface"],["AI Preferences","Models, creativity and defaults"],["Video Defaults","Format, quality and duration"],["Voice & Captions","Audio, voice and subtitle defaults"],["Brand Kit","Logo, colors and brand assets"],["Notifications","Email and product alerts"],["Integrations","YouTube, AI, storage and providers"],["Privacy & Security","Sessions, password and privacy"],["Billing & Usage","Plan, usage and invoices"],["Developer","API and automation settings"]].map(([title,description])=><a href="/settings" className="settings-card" key={title}><span className="settings-icon">⚙</span><span><strong>{title}</strong><small>{description}</small></span><b>→</b></a>)}</div><p className="hint">Open the Settings Center to change preferences and save them securely to your account.</p></section>
      <section className="pipeline-panel dashboard-pipeline"><div className="workspace-head"><div><span className="eyebrow">DEFAULT AUTOPILOT</span><h2>Recommended flow</h2></div><strong>14 stages</strong></div><div className="pipeline-steps">{["Idea","Research","Angle","Hook + Script","Title + Thumbnail","Voice","Visuals","Editing","Captions","SEO","Repurpose","Quality","Schedule + Publish","Analytics"].map((x,i)=><span className="pipeline-step" key={x}>{i+1}. {x}</span>)}</div><p className="hint">Full Auto can run the workflow in the background. Publishing stays behind an explicit quality/approval gate unless an administrator intentionally enables autonomous publishing.</p></section></div></div>
  </main>;
}
