export type UsageRecord={userId:string;provider:string;model:string;task:string;inputTokens:number;outputTokens:number;costUsd:number;createdAt:string};
export function estimateTextCost(inputTokens:number,outputTokens:number,inputRate=0,outputRate=0){return inputTokens*inputRate/1_000_000+outputTokens*outputRate/1_000_000;}
