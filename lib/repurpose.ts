import OpenAI from "openai";

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is not configured`);return value;}
export type RepurposeInput={title:string;script:string;platforms:string[];countPerPlatform?:number};
export async function generateRepurposedContent(input:RepurposeInput){
 const client=new OpenAI({apiKey:required("OPENAI_API_KEY")});
 const count=Math.min(Math.max(input.countPerPlatform??5,1),10);
 const platforms=input.platforms.filter(Boolean).slice(0,8);
 const prompt=`You are VidForge AI's platform repurposing engine. Convert the source into native short-form content. The hook MUST remain inside the opening of every final script. Do not invent unsupported facts. Adapt pacing, CTA, caption and hashtags to each platform. Supported platforms: YouTube, Instagram, Facebook, TikTok, LinkedIn, X. Return strict JSON only: {"items":[{"platform":"...","format":"Short|Reel|Video|Post","hook":"...","script":"...","caption":"...","hashtags":["..."]}]}. Create ${count} items per requested platform. Requested platforms: ${platforms.join(", ")}. Source title: ${input.title}. Source script:\n${input.script.slice(0,18000)}`;
 const response=await client.chat.completions.create({model:process.env.OPENAI_TEXT_MODEL||"gpt-4o-mini",response_format:{type:"json_object"},messages:[{role:"system",content:"You are a high-quality multi-platform content repurposing engine."},{role:"user",content:prompt}]});
 const raw=response.choices[0]?.message?.content;if(!raw)throw new Error("Repurposing model returned no content");
 const parsed=JSON.parse(raw) as {items?:unknown};if(!Array.isArray(parsed.items))throw new Error("Repurposing response is invalid");return parsed.items;
}
