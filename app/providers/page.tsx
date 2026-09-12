"use client";
import {useEffect,useState} from "react";
type State={configured?:boolean;connected?:boolean;accountName?:string};
type Data={providers?:Record<string,State>};
export default function Providers(){
 const[data,setData]=useState<Data>();
 const[busy,setBusy]=useState("");
 useEffect(()=>{fetch("/api/providers",{cache:"no-store"}).then(r=>r.json()).then(setData).catch(()=>{});},[]);
 const connect=()=>{setBusy("meta");window.location.href="/api/meta/connect"};
 const disconnect=async(provider:string)=>{setBusy(provider);await fetch("/api/meta/disconnect",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider})});window.location.reload()};
 const metaConfigured=Boolean(data?.providers?.facebook?.configured||data?.providers?.instagram?.configured);
 const cards=[
  {id:"youtube",name:"YouTube",desc:"OAuth publishing, scheduling and analytics",action:<a className="generate-btn" href="/api/youtube/connect">Connect YouTube →</a>},
  {id:"meta",name:"Instagram + Facebook",desc:"One secure Meta connection discovers your Facebook Pages and linked Instagram professional accounts.",action:metaConfigured?(<div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="generate-btn" onClick={connect} disabled={busy!==""}>{busy==="meta"?"Connecting…":"Connect / refresh Meta →"}</button>{data?.providers?.instagram?.connected&&<button className="generate-btn" onClick={()=>disconnect("INSTAGRAM")} disabled={busy!==""}>Disconnect Instagram</button>}{data?.providers?.facebook?.connected&&<button className="generate-btn" onClick={()=>disconnect("FACEBOOK")} disabled={busy!==""}>Disconnect Facebook</button>}</div>):<span className="live-pill">Meta app credentials required</span>},
  {id:"openai",name:"OpenAI",desc:"Generation, reasoning, voice and visual intelligence",action:<span className="live-pill">{data?.providers?.openai?.configured?"Configured":"Needs API key"}</span>},
  {id:"anthropic",name:"Anthropic",desc:"Optional advanced model provider",action:<span className="live-pill">{data?.providers?.anthropic?.configured?"Configured":"Optional"}</span>},
  {id:"google",name:"Google AI",desc:"Optional multimodal provider",action:<span className="live-pill">{data?.providers?.google?.configured?"Configured":"Optional"}</span>}
 ];
 return <main className="container"><nav className="nav"><a className="logo" href="/">NOVYN</a><span className="muted">Connections & Integrations</span></nav><section style={{padding:"45px 0"}}><span className="badge">NOVYN CONNECTION CENTER</span><h1 style={{fontSize:42}}>Social + AI integrations</h1><p className="muted">Connect once, then let NOVYN prepare platform-native publishing. Tokens remain encrypted server-side.</p><div className="grid">{cards.map(card=><article className="card" id={card.id} key={card.id}><h3>{card.name}</h3><p className="muted">{card.desc}</p>{card.id==="meta"&&data?.providers?.facebook?.connected&&<p className="live-pill" style={{marginBottom:12}}>Facebook connected{data.providers.facebook.accountName?` · ${data.providers.facebook.accountName}`:""}</p>}{card.id==="meta"&&data?.providers?.instagram?.connected&&<p className="live-pill" style={{marginBottom:12}}>Instagram connected</p>}{card.action}</article>)}</div></section></main>
}
