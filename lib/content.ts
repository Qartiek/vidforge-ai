import {generateJson} from "./ai";import {buildScriptPrompt,FinanceBrief} from "./finance";
export type GeneratedContent={hook:string;title:string;script:string;seoTitle:string;description:string;tags:string[]};
export async function generateContent(brief:FinanceBrief,research:string){return generateJson<GeneratedContent>("You create factual finance YouTube content. Use only supplied verified research. Never invent financial facts. Return strict JSON with hook,title,script,seoTitle,description,tags.",buildScriptPrompt(brief,research));}
