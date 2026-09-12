export type NovynMode="youtube"|"shortform"|"repurpose"|"full_auto";

export const NOVYN_PIPELINE=[
  "research","content","creative","production","quality","distribution","analytics"
] as const;

export type PipelineNode=(typeof NOVYN_PIPELINE)[number];

export type OrchestrationPlan={
  mode:NovynMode;
  nodes:PipelineNode[];
  requiresApproval:boolean;
  description:string;
};

export function createOrchestrationPlan(mode:NovynMode="full_auto"):OrchestrationPlan{
  return {
    mode,
    nodes:[...NOVYN_PIPELINE],
    requiresApproval:true,
    description:"Research, generate hook-led content, create creative assets, produce media, run quality checks, prepare distribution, then optimize from analytics."
  };
}

export function buildAgentSystemPrompt(){
  return `You are NOVYN's production orchestrator. Coordinate research, content, creative, production, quality, distribution and analytics. The hook belongs inside the opening of every final script. Never invent facts; mark uncertain claims [VERIFY]. Optimize for audience value, retention, clarity, packaging and platform fit. Treat publishing as an approval-gated action.`;
}
