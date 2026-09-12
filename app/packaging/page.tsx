"use client";
import { useState } from "react";

type Result = any;

export default function Packaging() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("English");
  const [result, setResult] = useState<Result>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch("/api/packaging", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, audience, niche, language, goal: "maximize growth" }) });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "Analysis failed");
      setResult(data.result);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  return <main className="container">
    <nav className="nav"><a className="logo" href="/">NOVYN</a><div className="nav-actions"><a className="nav-link" href="/dashboard">Dashboard</a><span className="live-pill success"><span/>Viral Packaging Engine</span></div></nav>
    <section className="studio-hero">
      <span className="badge">CTR + SEO + THUMBNAIL + VIRAL POTENTIAL</span>
      <h1 className="section-title">Make the <span className="gradient-text">packaging</span> impossible to ignore.</h1>
      <p className="studio-subtitle">NOVYN scores the topic, generates title and thumbnail variants, builds search metadata and blocks weak packaging before you publish.</p>
    </section>
    <section className="workspace">
      <div className="workspace-head"><div><div className="eyebrow">VIRAL PACKAGING LAB</div><h2>What are you publishing?</h2></div><div className="live-pill"><span/>AI scoring</div></div>
      <div className="topic-box"><label>Video topic</label><textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Example: Why AI video editing is changing YouTube in 2026"/><div className="hint">Use the real topic. NOVYN will find stronger angles instead of stuffing keywords.</div></div>
      <div className="control-grid">
        <div className="field"><label>Audience</label><input value={audience} onChange={e=>setAudience(e.target.value)} placeholder="e.g. Indian creators"/></div>
        <div className="field"><label>Niche</label><input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="e.g. AI / YouTube"/></div>
        <div className="field"><label>Language</label><select value={language} onChange={e=>setLanguage(e.target.value)}><option>English</option><option>Hindi</option><option>Hinglish</option><option>Bengali</option></select></div>
      </div>
      <button className="generate-btn" onClick={analyze} disabled={loading || topic.trim().length < 3}><span className="spark">✦</span>{loading ? "Analyzing topic + packaging..." : "Build Viral Packaging"}<span className="arrow">→</span></button>
      {error && <div className="error-box">{error}</div>}
    </section>

    {result && <section className="result-shell">
      <div className="result-top"><div><div className="eyebrow">AI VERDICT</div><h2>{result.viralScore}/100 Viral Potential</h2></div><div className={`live-pill ${result.publishGate?.ready ? "success" : ""}`}><span/>{result.publishGate?.ready ? "Publish ready" : "Needs another pass"}</div></div>
      <div className="result-grid">
        {Object.entries(result.scores || {}).map(([k,v]: any)=><div className="result-card" key={k}><div className="mini-label">{k.replace(/([A-Z])/g," $1").toUpperCase()}</div><h3>{v}/100</h3></div>)}
        <div className="result-card featured wide"><div className="mini-label">BEST TITLE × THUMBNAIL PAIRINGS</div>{(result.combinations||[]).slice(0,5).map((x:any,i:number)=><div key={i} style={{padding:"13px 0",borderBottom:"1px solid rgba(148,163,184,.1)"}}><strong>#{i+1} · {x.score}/100</strong><div style={{marginTop:6}}>{x.title}</div><div className="muted" style={{fontSize:12,marginTop:4}}>{x.thumbnail}</div></div>)}</div>
        <div className="result-card"><div className="mini-label">TITLE LAB</div>{(result.titles||[]).map((x:string,i:number)=><p key={i}><strong>{i+1}.</strong> {x}</p>)}</div>
        <div className="result-card"><div className="mini-label">THUMBNAIL LAB</div>{(result.thumbnails||[]).map((x:any,i:number)=><div key={i} style={{marginBottom:16}}><strong>{i+1}. {x.concept}</strong><p style={{margin:"6px 0"}}>Text: {x.text} · Score: {x.score}/100</p><div className="muted" style={{fontSize:12}}>{x.composition}</div></div>)}</div>
        <div className="result-card"><div className="mini-label">SEO KEYWORDS</div><h3>{result.primaryKeyword}</h3>{(result.secondaryKeywords||[]).map((x:string)=><span className="tag" key={x}>{x}</span>)}</div>
        <div className="result-card"><div className="mini-label">TAGS + HASHTAGS</div>{[...(result.tags||[]),...(result.hashtags||[])].map((x:string)=><span className="tag" key={x}>{x}</span>)}</div>
        <div className="result-card wide"><div className="mini-label">PUBLISH GATE</div>{(result.publishGate?.reasons||[]).map((x:string)=><p key={x}>• {x}</p>)}<div className="hint">Viral scores are probability signals, not guarantees. Actual distribution depends on audience response, topic timing and platform behavior.</div></div>
      </div>
    </section>}
  </main>;
}
