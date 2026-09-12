import "./home.css";

const features = [
  ["Text to Video", "Turn your ideas into polished videos.", "/create", "✦"],
  ["Image to Video", "Bring images to life with motion.", "/create", "◈"],
  ["AI Avatars", "Create with a virtual presenter.", "/production", "♙"],
  ["Templates", "Start faster with ready-made styles.", "/templates", "▣"],
];

const footerGroups = [
  { title: "Product", links: [["Create Video", "/create"], ["Templates", "/templates"], ["Research", "/research"], ["Production", "/production"], ["Analytics", "/production"]] },
  { title: "Company", links: [["About NOVYN", "#about"], ["Features", "#features"], ["Pricing", "#pricing"], ["Contact & Support", "mailto:support@novyn.ai"]] },
  { title: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Cookie Policy", "/cookies"], ["AI Disclaimer", "#disclaimer"]] },
];

export default function Home() {
  return (
    <div className="home-page">
      <nav className="nav container home-nav">
        <a className="logo" href="/" aria-label="NOVYN home">NOVYN</a>
        <div className="home-nav-links">
          <a href="#home">Home</a><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#about">About</a>
        </div>
        <div className="home-nav-actions"><a className="home-signin" href="/login">Sign In</a><a className="cta" href="/signup">Get Started</a></div>
      </nav>

      <main id="home" className="container home-main">
        <section className="home-hero">
          <div className="home-copy">
            <span className="badge">✦ AI VIDEO CREATION PLATFORM</span>
            <h1>Turn Ideas Into <span>Stunning</span> Videos</h1>
            <p>NOVYN helps you create professional-quality videos with the power of AI. Fast, simple, and limitless.</p>
            <div className="home-hero-actions"><a className="cta home-primary" href="/signup">Start Creating Free <span>→</span></a><a className="home-demo" href="/production">▷ &nbsp; Watch Demo</a></div>
          </div>
          <div className="hero-visual" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-n">N</div><div className="hero-glow glow-red"/><div className="hero-glow glow-blue"/></div>
        </section>

        <section id="features" className="home-feature-strip">
          {features.map(([title, desc, href, icon]) => <a href={href} className="home-feature" key={title}><span className="home-feature-icon">{icon}</span><span><strong>{title}</strong><small>{desc}</small></span></a>)}
          <div className="home-flow" aria-label="Create edit share"><span>←</span> Create <b>→</b> Edit <b>→</b> Share <span>→</span></div>
        </section>

        <section id="pricing" className="home-bottom-grid">
          <div className="home-info-card"><span className="eyebrow">AI POWERED</span><h2>Smarter. Faster.<br/><em>Better.</em></h2><p>From scripts and visuals to voiceovers and editing, NOVYN brings your complete video workflow into one focused studio.</p><a className="mini-cta" href="/create">Learn More →</a></div>
          <div id="about" className="home-info-card templates-card"><span className="eyebrow">PROFESSIONAL TEMPLATES</span><h2>Beautiful Templates<br/>for Every Need</h2><p>Find the right starting point for social media, business, storytelling and more.</p><a className="mini-cta" href="/templates">Explore Templates →</a></div>
        </section>

        <section className="home-about-panel" aria-labelledby="about-heading">
          <div><span className="eyebrow">ABOUT NOVYN</span><h2 id="about-heading">A complete AI content operating system.</h2></div>
          <p>NOVYN connects research, ideation, scripting, production, packaging, publishing and analytics into one focused creative workspace. The platform is designed to help creators move from an idea to a publish-ready content operation with fewer disconnected tools.</p>
        </section>

        <section id="disclaimer" className="home-disclaimer">
          <span className="eyebrow">IMPORTANT INFORMATION</span>
          <h2>AI content disclaimer</h2>
          <p>NOVYN uses artificial intelligence to assist with research, writing, media generation, optimization and other creative tasks. AI-generated outputs can contain inaccuracies, omissions, bias or errors. Always review generated content, rights, sources, claims and platform requirements before publishing or relying on it. NOVYN does not guarantee the accuracy, originality, performance or suitability of generated content.</p>
        </section>

        <footer className="home-footer">
          <div className="footer-brand"><a className="logo" href="/">NOVYN</a><p>Create beyond imagination.</p><small>AI-powered video creation for modern creators and teams.</small></div>
          <div className="footer-links">{footerGroups.map(group => <div key={group.title}><strong>{group.title}</strong>{group.links.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</div>)}</div>
        </footer>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} NOVYN. All rights reserved.</span><span>System status: <b>Operational</b></span><span>Built for creators. Powered by AI.</span></div>
      </main>
    </div>
  );
}
