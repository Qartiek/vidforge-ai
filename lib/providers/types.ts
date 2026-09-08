export type AIProvider="openai"|"anthropic"|"google";
export type TextTask="research"|"hook"|"script"|"seo";
export type ProviderResult={provider:AIProvider;model:string;output:string;usage?:{inputTokens?:number;outputTokens?:number};costUsd?:number};
export interface TextProvider{generate(task:TextTask,prompt:string):Promise<ProviderResult>;}
