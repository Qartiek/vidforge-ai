export type VoicePlan={provider:"openai";model:string;format:"mp3";voice:string};
export type ScenePlan={index:number;start:number;end:number;prompt:string};
export type ProductionPlan={durationSeconds:number;scenes:ScenePlan[];voice:VoicePlan;visuals:{format:"16:9";sources:string[]};thumbnail:{format:"1280x720";variants:number}};

export function getAutoDurationSeconds(script:string,platform="YouTube",format="Long-form video"){
 const words=script.trim().split(/\s+/).filter(Boolean).length;
 const p=platform.toLowerCase(), f=format.toLowerCase();
 const short=p.includes("instagram")||p.includes("tiktok")||p.includes("facebook")||f.includes("short")||f.includes("reel");
 if(short)return Math.min(180,Math.max(15,Math.round(words/2.8)));
 if(f.includes("long")||f.includes("documentary")||f.includes("explainer"))return Math.min(3600,Math.max(60,Math.round(words/2.45)));
 return Math.min(1800,Math.max(30,Math.round(words/2.55)));
}

export function buildProductionPlan(script:string,options?:{platform?:string;format?:string;durationMode?:"auto"|"manual";durationSeconds?:number}):ProductionPlan{
 const platform=options?.platform||"YouTube"; const format=options?.format||"Long-form video";
 const duration=options?.durationMode==="manual"&&options.durationSeconds?Math.max(15,Math.min(3600,Math.round(options.durationSeconds))):getAutoDurationSeconds(script,platform,format);
 const scenes=Math.max(format.toLowerCase().includes("short")||format.toLowerCase().includes("reel")?4:6,Math.ceil(duration/8));
 return {durationSeconds:duration,voice:{provider:"openai",model:process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",format:"mp3",voice:process.env.OPENAI_TTS_VOICE||"alloy"},scenes:Array.from({length:scenes},(_,i)=>({index:i,start:Math.round(i*duration/scenes),end:Math.round((i+1)*duration/scenes),prompt:`Cinematic ${format} visual for ${platform}, matching the verified script; no invented facts, charts or logos.`})),visuals:{format:"16:9",sources:["licensed stock","user assets","generated visuals"]},thumbnail:{format:"1280x720",variants:3}};
}
