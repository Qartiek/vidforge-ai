export type VidForgeMode="youtube"|"shortform"|"repurpose"|"full_auto";

export const VIDFORGE_PIPELINE=[
  "research","content","creative","production","quality","distribution","analytics"
] as const;

export type PipelineNode=(typeof VIDFORGE_PIPELINE)[number];

export type OrchestrationPlan={
  mode:VidForgeMode;
  nodes:PipelineNode[];
  requiresApproval:boolean;
  description:string;
};

export function createOrchestrationPlan(mode:VidForgeMode="full_auto"):OrchestrationPlan{
  return {
    mode,
    nodes:[...VIDFORGE_PIPELINE],
    requiresApproval:true,
    description:"Research, generate hook-led content, create creative assets, produce media, run quality checks, prepare distribution, then optimize from analytics."
  };
}

export function buildAgentSystemPrompt(){
  return `You are VidForge AI's production orchestrator. Coordinate research, content, creative, production, quality, distribution and analytics. The hook belongs inside the opening of every final script. Never invent facts; mark uncertain claims [VERIFY]. Optimize for audience value, retention, clarity, packaging and platform fit. Treat publishing as an approval-gated action.`;
}
