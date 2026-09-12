"use client";

import { useEffect, useMemo, useState } from "react";

type Option = { id: string; title: string; topic: string; assets: { id: string; type: string; url: string; createdAt: string }[] };

export default function SchedulePage() {
  const [options, setOptions] = useState<Option[]>([]);
  const [projectId, setProjectId] = useState("");
  const [assetRef, setAssetRef] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/schedule/options", { cache: "no-store" })
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Unable to load projects"); return data; })
      .then((data) => {
        setOptions(data.projects || []);
        const first = data.projects?.[0];
        if (first) {
          setProjectId(first.id);
          const asset = first.assets?.find((x: Option["assets"][number]) => /video|render|mp4/i.test(`${x.type} ${x.url}`)) || first.assets?.[0];
          if (asset) setAssetRef(asset.id);
          setTitle(first.title || "NOVYN video");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load projects"))
      .finally(() => setLoading(false));
  }, []);

  const project = useMemo(() => options.find((x) => x.id === projectId) || null, [options, projectId]);

  function changeProject(value: string) {
    setProjectId(value);
    const next = options.find((x) => x.id === value);
    setTitle(next?.title || "NOVYN video");
    setAssetRef(next?.assets?.[0]?.id || "");
  }

  async function schedule() {
    setSaving(true); setError(""); setMessage("");
    try {
      const when = new Date(scheduledAt);
      if (!projectId || !assetRef || !title.trim() || Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) throw new Error("Choose a video and a future date/time");
      const r = await fetch("/api/youtube/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          assetRef,
          title: title.trim(),
          description: description.trim() || undefined,
          tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
          privacyStatus: "private",
          scheduledAt: when.toISOString(),
          idempotencyKey: `schedule-${projectId}-${assetRef}-${when.getTime()}`,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not schedule video");
      setMessage(`Scheduled successfully for ${new Date(data.scheduledAt).toLocaleString()}. YouTube will keep it private until the scheduled publish time.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not schedule video"); }
    finally { setSaving(false); }
  }

  return <main className="container">
    <nav className="nav"><a href="/dashboard" className="logo" style={{ textDecoration: "none" }}>NOVYN</a><div className="nav-actions"><span className="status-dot"/> YouTube Scheduler <a className="nav-link" href="/dashboard">Dashboard</a></div></nav>
    <section className="studio-hero">
      <span className="badge">✦ YOUTUBE SCHEDULER</span>
      <h1 className="section-title">Publish on your schedule.</h1>
      <p className="studio-subtitle">Choose a finished video, set a future time, and NOVYN queues the secure YouTube upload with a private scheduled publish.</p>
    </section>
    <section className="workspace" style={{ maxWidth: 860 }}>
      {loading ? <p className="muted">Loading your latest projects…</p> : options.length === 0 ? <div className="hint">Create a video first. Your finished project and video asset will appear here.</div> : <>
        <div className="control-grid">
          <Field label="Project"><select value={projectId} onChange={(e) => changeProject(e.target.value)}>{options.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></Field>
          <Field label="Video asset"><select value={assetRef} onChange={(e) => setAssetRef(e.target.value)}>{project?.assets.map((x) => <option key={x.id} value={x.id}>{x.type} · {x.id.slice(0, 8)}</option>)}</select></Field>
          <Field label="Title"><input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="YouTube title" /></Field>
          <Field label="Publish date & time"><input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></Field>
        </div>
        <div className="field" style={{ marginTop: 18 }}><label>Description</label><textarea value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Video description" /></div>
        <div className="field" style={{ marginTop: 18 }}><label>Tags</label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ai, youtube, creator" /></div>
        <div className="hint" style={{ marginTop: 18 }}>Scheduled uploads use YouTube's private + publishAt flow, so the video is not public before the selected time.</div>
        {error && <div className="error-box" style={{ marginTop: 16 }}>{error}</div>}
        {message && <div className="hint" style={{ marginTop: 16 }}>{message}</div>}
        <button className="generate-btn" onClick={schedule} disabled={saving}>{saving ? "Scheduling securely…" : "Schedule YouTube upload →"}</button>
      </>}
    </section>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
