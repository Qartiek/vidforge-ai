export type ResearchBrief = { topic: string; audience: string; platform: string; language: string };

export function buildResearchPlan(brief: ResearchBrief) {
  return {
    angle: `Research the most compelling and underserved angle for ${brief.topic} targeting ${brief.audience}`,
    sources: [
      `Academic and peer-reviewed research on ${brief.topic}`,
      `Industry reports and analyst perspectives on ${brief.topic}`,
      `Recent news and developments in ${brief.topic}`,
      `Expert commentary and thought leadership on ${brief.topic}`,
      `Case studies and real-world examples of ${brief.topic}`,
    ],
    synthesis: `Synthesize findings into a unique, audience-first angle that serves ${brief.audience} on ${brief.platform}`,
  };
}

export function buildResearchPrompt(brief: ResearchBrief) {
  return `You are a research synthesizer for content creators. Given the topic "${brief.topic}" and target audience "${brief.audience}" on ${brief.platform}:

1. Identify the most compelling, underserved angle that will resonate with this audience
2. List the key claims, statistics, and evidence that support this angle
3. Highlight any research gaps or claims that need verification
4. Recommend the strongest sources and evidence to build this story
5. Suggest the optimal narrative structure for ${brief.platform}

Return a JSON object with keys: angle, keyFacts, verificationNeeds, recommendedSources, narrativeStructure.`;
}
