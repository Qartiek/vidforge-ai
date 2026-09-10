const features = [
  ["Research Engine", "Find and structure source-backed information for your video.", "/create"],
  ["Script & Hook AI", "Generate strong hooks, narrative structure and complete scripts.", "/create"],
  ["Video Production", "Turn scripts into voice, visuals, captions and edited videos.", "/production"],
];

export default function Home() {
  return (
    <>
      <nav className="nav">
        <div className="logo">VidForge AI</div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <a className="muted" href="/login">Sign in</a>
          <a className="cta" href="/signup">Get Started</a>
        </div>
      </nav>

      <main className="container">
        <section className="hero" id="start">
          <span className="badge">AI YouTube Content Automation</span>
          <h1>From idea to<br/>YouTube video.</h1>
          <p>Research, hooks, scripts, voiceovers, visuals, editing, thumbnails and SEO — brought together in one automation workflow.</p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginTop:24}}>
            <a className="cta" href="/signup">Create free account</a>
            <a className="cta" href="/login" style={{background:"transparent",border:"1px solid #334155"}}>Sign in</a>
          </div>
        </section>

        <section id="features" className="grid">
          {features.map(([title, desc, href]) => (
            <a href={href} className="card" key={title} style={{textDecoration:"none",display:"block"}}>
              <h3>{title}</h3>
              <p className="muted">{desc}</p>
              <span className="cta" style={{display:"inline-block",marginTop:12}}>Open →</span>
            </a>
          ))}
        </section>
      </main>
    </>
  );
}
