export type VoicePlan={provider:"openai";model:string;format:"mp3";voice:string};
export type ScenePlan={index:number;start:number;end:number;prompt:string};
export type ProductionPlan={durationSeconds:number;scenes:ScenePlan[];voice:VoicePlan;visuals:{format:"16:9";sources:string[]};thumbnail:{format:"1280x720";variants:number}};

type DurationOptions={platform?:string;format?:string;durationMode?:"auto"|"manual";durationSeconds?:number};
function words(script:string){return script.trim().split(/\s+/).filter(Boolean).length;}
function isShort(platform:string,format:string){const p=platform.toLowerCase(),f=format.toLowerCase();return p.includes("instagram")||p.includes("tiktok")||f.includes("short")||f.includes("reel")||f.includes("vertical short");}
export function getAutoDurationSeconds(script:string,platform="YouTube",format="Long-form video"){
 const count=words(script); const p=platform.toLowerCase(), f=format.toLowerCase();
 if(isShort(platform,format)){
   const floor=p.includes("youtube")?20:15;
   return Math.min(180,Math.max(floor,Math.round(count/2.65)));
 }
 if(f.includes("long")||f.includes("documentary")||f.includes("explainer")) return Math.min(3600,Math.max(90,Math.round(count/2.45)));
 return Math.min(1800,Math.max(45,Math.round(count/2.55)));
}
export function buildProductionPlan(script:string,options?:DurationOptions):ProductionPlan{
 const platform=options?.platform||"YouTube", format=options?.format||"Long-form video";
 const auto=getAutoDurationSeconds(script,platform,format);
 const duration=options?.durationMode==="manual"&&Number.isFinite(options.durationSeconds)?Math.max(15,Math.min(3600,Math.round(options.durationSeconds!))):auto;
 const short=isShort(platform,format); const scenes=Math.max(short?4:6,Math.ceil(duration/(short?5:8)));
 return {durationSeconds:duration,voice:{provider:"openai",model:process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",format:"mp3",voice:process.env.OPENAI_TTS_VOICE||"alloy"},scenes:Array.from({length:scenes},(_,i)=>({index:i,start:Math.round(i*duration/scenes),end:Math.round((i+1)*duration/scenes),prompt:`Cinematic ${format} visual for ${platform}, matching the verified script; use deliberate visual changes, no invented facts, charts or logos.`})),visuals:{format:"16:9",sources:["licensed stock","user assets","generated visuals"]},thumbnail:{format:"1280x720",variants:3}};
}
