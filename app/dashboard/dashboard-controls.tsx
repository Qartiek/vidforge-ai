"use client";

import { useEffect, useState } from "react";

export default function DashboardControls({ projectId }: { projectId: string | null }) {
  const [youtube, setYoutube] = useState<{ connected: boolean; channelTitle?: string | null }>({ connected: false });
  const [jobs, setJobs] = useState<any[]>([]);
  const [projectStatus, setProjectStatus] = useState<string>("DRAFT");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const y = await fetch("/api/youtube/status", { cache: "no-store" });
        if (y.ok && active) setYoutube(await y.json());
        if (projectId) {
          const p = await fetch(`/api/pipeline/status?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
          if (p.ok && active) { const data = await p.json(); setJobs(data.jobs || []); setProjectStatus(data.project?.status || "DRAFT"); }
        }
      } catch { /* keep last known dashboard state */ }
    };
    load();
    const id = setInterval(load, 4000);
    return () => { active = false; clearInterval(id); };
  }, [projectId]);

  const pipelineJobs = jobs.filter((j) => String(j.type).startsWith("pipeline:") || j.type === "production_pipeline");
  const stages = ["research", "content", "creative", "voice", "visuals", "editing", "captions", "seo", "repurpose", "quality", "publish", "analytics"];
  const completed = new Set(pipelineJobs.filter((j) => j.status === "SUCCEEDED").map((j) => String(j.type).startsWith("pipeline:") ? String(j.type).slice(9) : ""));
  const progress = Math.min(100, Math.round(([...completed].filter((x) => stages.includes(x)).length / stages.length) * 100));
  const running = pipelineJobs.some((j) => j.status === "RUNNING" || j.status === "QUEUED");

  return <>
    <section className="workspace" style={{ marginTop: 22 }}>
      <div className="workspace-head"><div><span className="eyebrow">YOUTUBE CHANNEL</span><h2>{youtube.connected ? (youtube.channelTitle || "Channel connected") : "Connect your channel"}</h2></div><span className={`live-pill ${youtube.connected ? "success" : ""}`}><span/> {youtube.connected ? "Connected" : "Not connected"}</span></div>
      <p className="muted">Connect once to unlock secure uploads, scheduled publishing and channel analytics.</p>
      <div className="dashboard-actions">
        {youtube.connected ? <><a className="cta" href="/schedule">Schedule a video →</a><a className="cta secondary-cta" href="/api/youtube/disconnect">Reconnect YouTube</a></> : <a className="cta" href="/api/youtube/connect">Connect YouTube →</a>}
      </div>
    </section>

    {projectId && <section className="pipeline-panel dashboard-pipeline" style={{ marginTop: 22 }}>
      <div className="workspace-head"><div><span className="eyebrow">LIVE PRODUCTION</span><h2>Background progress</h2></div><strong>{progress}%</strong></div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }}/></div>
      <p className="hint">{running ? `NOVYN is processing your latest project · ${projectStatus.toLowerCase()}.` : progress >= 100 ? "Latest project pipeline completed." : "Start a project from Create with AI to see live progress here."}</p>
      <div className="pipeline-steps">{stages.map((stage, i) => <span key={stage} className={completed.has(stage) ? "pipeline-step done" : "pipeline-step"}>{i + 1}. {stage}{completed.has(stage) ? " ✓" : ""}</span>)}</div>
    </section>}
  </>;
}
