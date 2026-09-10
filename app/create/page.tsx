"use client";
import {useState} from "react";

const platforms=["YouTube","Instagram","Facebook","TikTok"];
const formats=["Long-form video","Shorts / Reel","Faceless explainer","Storytelling video"];
const tones=["Engaging","Educational","Storytelling","Professional","Dramatic"];

export default function Create(){
 const [topic,setTopic]=useState("");
 const [audience,setAudience]=useState("General audience");
 const [platform,setPlatform]=useState("YouTube");
 const [format,setFormat]=useState("Long-form video");
 const [tone,setTone]=useState("Engaging");
 const [language,setLanguage]=useState("English");
 const [duration,setDuration]=useState("8");
 const [result,setResult]=useState<any>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 async function start(){setLoading(true);setError("");setResult(null);try{const r=await fetch("/api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({topic,audience,platform,format,tone,language,durationMinutes:Number(duration)})});const data=await r.json();if(!r.ok)throw new Error(data.error||"Generation failed");setResult(data)}catch(e){setError(e instanceof Error?e.message:"Generation failed")}finally{setLoading(false)}}
 return <main className="container">
  <nav className="nav"><a href="/" className="logo" style={{textDecoration:"none"}}>VidForge AI</a><div className="nav-actions"><span className="status-dot"/> AI Content Studio <a className="nav-link" href="/production">Production</a></div></nav>
  <section className="studio-hero">
   <span className="badge">✦ AI CONTENT CREATION ENGINE</span>
   <h1 className="section-title">Turn one idea into <span className="gradient-text">content that moves.</span></h1>
   <p className="studio-subtitle">Research direction, powerful script with hook, titles, thumbnails, SEO and short-form repurposing — built from one brief.</p>
  </section>
  <section className="workspace">
   <div className="workspace-head"><div><span className="eyebrow">01 · CONTENT BRIEF</span><h2>What do you want to create?</h2></div><span className="live-pill"><span/> Ready</span></div>
   <div className="topic-box"><label>Topic / idea</label><textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Tell VidForge what you want to create…" rows={4}/><div className="hint">Be specific about the idea, problem, story or topic. AI will build the content structure.</div></div>
   <div className="control-grid">
    <Field label="Platform"><select value={platform} onChange={e=>setPlatform(e.target.value)}>{platforms.map(x=><option key={x}>{x}</option>)}</select></Field>
    <Field label="Format"><select value={format} onChange={e=>setFormat(e.target.value)}>{formats.map(x=><option key={x}>{x}</option>)}</select></Field>
    <Field label="Audience"><input value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Who is this for?"/></Field>
    <Field label="Tone"><select value={tone} onChange={e=>setTone(e.target.value)}>{tones.map(x=><option key={x}>{x}</option>)}</select></Field>
    <Field label="Language"><input value={language} onChange={e=>setLanguage(e.target.value)} placeholder="English / Hindi / Hinglish"/></Field>
    <Field label="Duration"><div className="duration-wrap"><input type="number" min="1" max="30" value={duration} onChange={e=>setDuration(e.target.value)}/><span>min</span></div></Field>
   </div>
   <button className="generate-btn" onClick={start} disabled={!topic.trim()||loading}><span className="spark">✦</span>{loading?"Creating your content…":"Generate Content"}<span className="arrow">→</span></button>
   {error&&<div className="error-box">{error}</div>}
  </section>
  {result?.content&&<section className="result-shell"><div className="result-top"><div><span className="eyebrow">02 · AI OUTPUT</span><h2>Your content package</h2></div><span className="live-pill success"><span/> Generated</span></div><div className="result-grid"><article className="result-card featured"><span className="mini-label">TITLE</span><h3>{result.content.title}</h3><span className="mini-label">HOOK</span><p>{result.content.hook}</p></article><article className="result-card"><span className="mini-label">SEO TITLE</span><h3>{result.content.seoTitle}</h3><span className="mini-label">DESCRIPTION</span><p>{result.content.description}</p></article><article className="result-card wide"><span className="mini-label">SCRIPT</span><pre>{result.content.script}</pre></article><article className="result-card"><span className="mini-label">TAGS</span><div>{(result.content.tags||[]).map((x:string,i:number)=><span className="tag" key={i}>{x}</span>)}</div></article><article className="result-card"><span className="mini-label">THUMBNAIL CONCEPTS</span><ul>{(result.content.thumbnailConcepts||[]).map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></article></div></section>}
 </main>
}
function Field({label,children}:{label:string,children:React.ReactNode}){return <div className="field"><label>{label}</label>{children}</div>}
