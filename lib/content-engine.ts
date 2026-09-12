export type ContentBrief = {
  topic: string;
  audience: string;
  durationMinutes: number;
  tone: string;
  language: string;
  platform: string;
  format: string;
  researchContext?: string;
};

export type GeneratedContent = {
  hook: string;
  title: string;
  script: string;
  seoTitle: string;
  description: string;
  tags: string[];
  thumbnailConcepts: string[];
  shortFormHooks: string[];
  cta: string;
  contentAngle?: string;
  retentionBeats?: string[];
  claimsToVerify?: string[];
};

export function buildContentPrompt(brief: ContentBrief) {
  return `You are NOVYN's senior content strategist, researcher and retention editor. Create a production-ready ${brief.format} for ${brief.platform}. Topic: ${brief.topic}. Audience: ${brief.audience}. Duration: ${brief.durationMinutes} minutes. Tone: ${brief.tone}. Language: ${brief.language}. ${brief.researchContext ? `Use this research intelligence as context: ${brief.researchContext}` : "No verified research context was supplied; do not invent current facts."} First choose the strongest audience value proposition and content angle. Then write the final script with a compelling HOOK as its opening lines. The hook is PART OF THE SCRIPT, never a separate production stage. Structure the script for retention with an immediate promise, pattern interrupts, open loops that are honestly resolved, concrete examples, transitions, payoff moments, conclusion and natural CTA. Generate a strong title, SEO title, description, tags, thumbnail concepts and short-form repurposing hooks. Keep factual claims grounded in supplied research; never fabricate facts, statistics, quotes, sources or current events. Put uncertain factual claims in claimsToVerify and mark them [VERIFY] where they appear. Return valid JSON only with keys: hook,title,script,seoTitle,description,tags,thumbnailConcepts,shortFormHooks,cta,contentAngle,retentionBeats,claimsToVerify.`;
}

export function buildWorkflowStages() {
  return [
    "idea",
    "research",
    "content_angle",
    "script_with_hook",
    "title_thumbnail",
    "voiceover",
    "visuals",
    "editing",
    "captions",
    "seo",
    "shorts_reels",
    "quality_check",
    "schedule_publish",
    "analytics_optimize",
  ];
}
