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
  return <main className="container">
    <nav className="nav"><a href="/dashboard" className="logo" style={{textDecoration:"none"}}>NOVYN</a><div className="nav-actions"><span className="status-dot"/> COMMAND CENTER <span className="muted">{user.name || user.email}</span><a className="nav-link" href="/jobs">Jobs</a><a className="nav-link" href="/pricing">Plans</a></div></nav>
    <section className="studio-hero"><span className="badge">✦ AUTONOMOUS CONTENT OPERATING SYSTEM</span><h1 className="section-title">From <span className="gradient-text">one idea</span> to a publish-ready content operation.</h1><p className="studio-subtitle">Research → Hook → Script → Creative → Voice → Visuals → Editing → Captions → SEO → Repurpose → Quality → Schedule → Publish → Analytics.</p><div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:24}}><a className="cta" href="/create">Create with AI →</a><a className="cta" href="/packaging" style={{background:"rgba(16,23,45,.8)",boxShadow:"none",border:"1px solid #2b3756"}}>Open Viral Lab</a></div></section>
    <section className="workspace"><div className="workspace-head"><div><span className="eyebrow">AI WORKFLOW</span><h2>All production modules</h2></div><span className="live-pill"><span/> System ready</span></div><div className="grid">{modules.map(([number,title,description,href])=><a key={title} href={href} className="card" style={{textDecoration:"none",display:"block"}}><span className="badge">{number}</span><h3 style={{fontSize:19,marginTop:16}}>{title}</h3><p className="muted">{description}</p><span style={{color:"#a99cff",fontWeight:700}}>Open module →</span></a>)}</div></section>
    <section className="pipeline-panel" style={{marginTop:20}}><div className="workspace-head"><div><span className="eyebrow">DEFAULT AUTOPILOT</span><h2>Recommended flow</h2></div><strong>14 stages</strong></div><div className="pipeline-steps">{["Idea","Research","Angle","Hook + Script","Title + Thumbnail","Voice","Visuals","Editing","Captions","SEO","Repurpose","Quality","Schedule + Publish","Analytics"].map((x,i)=><span className="pipeline-step" key={x}>{i+1}. {x}</span>)}</div><p className="hint">Full Auto can run the workflow in the background. Publishing stays behind an explicit quality/approval gate unless an administrator intentionally enables autonomous publishing.</p></section>
  </main>;
}
