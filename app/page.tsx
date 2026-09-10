const features = [
  ["Research Engine", "Source-backed research, trends and content angles.", "/create"],
  ["Script + Hook AI", "Retention-focused scripts with the hook built into the opening.", "/create"],
  ["Production Studio", "Voice, visuals, captions, editing, thumbnails and SEO.", "/production"],
];

export default function Home() {
  return (
    <>
      <nav className="nav container">
        <div className="logo">VidForge AI</div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <a className="muted" href="/login" style={{textDecoration:"none",fontWeight:600}}>Sign in</a>
          <a className="cta" href="/signup">Get Started</a>
        </div>
      </nav>

      <main className="container">
        <section className="hero" id="start">
          <span className="badge">● AI CONTENT CREATION + YOUTUBE AUTOMATION</span>
          <h1>Turn one idea into<br/>content people want to watch.</h1>
          <p>Research, hook-driven scripts, titles, thumbnails, voiceovers, visuals, editing, captions, SEO and social repurposing — built into one powerful workflow.</p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginTop:28}}>
            <a className="cta" href="/signup">Start creating free →</a>
            <a className="cta" href="#features" style={{background:"rgba(16,23,45,.8)",boxShadow:"none",border:"1px solid #2b3756"}}>Explore Studio</a>
          </div>
        </section>

        <section id="features" className="grid">
          {features.map(([title, desc, href], i) => (
            <a href={href} className="card" key={title} style={{textDecoration:"none",display:"block"}}>
              <span className="badge">0{i + 1}</span>
              <h3 style={{fontSize:20,marginTop:18}}>{title}</h3>
              <p className="muted">{desc}</p>
              <span style={{color:"#a99cff",fontWeight:700}}>Open Studio →</span>
            </a>
          ))}
        </section>
      </main>
    </>
  );
}
