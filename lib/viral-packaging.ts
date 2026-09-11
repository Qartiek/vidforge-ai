import OpenAI from "openai";

export type PackagingInput = {
  topic: string;
  audience?: string;
  language?: string;
  niche?: string;
  goal?: string;
};

export type PackagingResult = {
  viralScore: number;
  scores: {
    trendPotential: number;
    ctrPotential: number;
    hookStrength: number;
    audienceFit: number;
    retentionPotential: number;
    seoOpportunity: number;
    competition: number;
    monetizationPotential: number;
  };
  titles: string[];
  thumbnails: { concept: string; text: string; composition: string; score: number }[];
  combinations: { title: string; thumbnail: string; score: number }[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  tags: string[];
  hashtags: string[];
  description: string;
  chapters: string[];
  publishGate: { ready: boolean; reasons: string[] };
};

function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }

function fallback(input: PackagingInput): PackagingResult {
  const topic = input.topic.trim();
  const words = topic.split(/\s+/).filter(Boolean);
  const keyword = words.slice(0, 6).join(" ");
  const curiosity = /why|how|secret|truth|mistake|best|new|viral|future|danger|real/i.test(topic) ? 88 : 76;
  const titles = [
    `${topic}: The Truth Nobody Explains`,
    `I Tested ${topic} — Here's What Actually Happened`,
    `Why ${topic} Is Getting So Much Attention Right Now`,
    `The Biggest Mistake People Make With ${topic}`,
    `${topic} Explained: What You Need to Know`,
  ];
  const thumbnails = [
    { concept: "One focal subject + strong reaction + curiosity gap", text: "THE TRUTH", composition: "Large face/object on one side, simple high-contrast phrase on the other, no clutter", score: 91 },
    { concept: "Before/after or problem/result contrast", text: "I TESTED IT", composition: "Two-panel visual with one dominant subject and clear directional contrast", score: 89 },
    { concept: "Mystery/reveal", text: "NOBODY TELLS YOU", composition: "Close-up subject, highlighted detail, dark negative space for readable text", score: 87 },
    { concept: "Numbers/result", text: "WORTH IT?", composition: "Single object/result with a large visual cue and minimal supporting text", score: 86 },
  ];
  const secondary = [...new Set([`${keyword} explained`, `${keyword} tips`, `${keyword} guide`, `${keyword} 2026`, `how ${keyword} works`])];
  const tags = [...new Set([keyword, ...secondary, ...(input.niche ? [input.niche] : []), "youtube", "explained", "guide"])].slice(0, 15);
  const hashtags = ["#YouTube", "#Explained", ...(input.niche ? [`#${input.niche.replace(/[^a-z0-9]/gi, "")}`] : [])];
  const scores = { trendPotential: 82, ctrPotential: curiosity, hookStrength: 90, audienceFit: 86, retentionPotential: 84, seoOpportunity: 83, competition: 62, monetizationPotential: 78 };
  const viralScore = clamp((scores.trendPotential + scores.ctrPotential + scores.hookStrength + scores.audienceFit + scores.retentionPotential + scores.seoOpportunity + scores.monetizationPotential + (100 - scores.competition)) / 8);
  const combinations = titles.slice(0, 4).flatMap((title, i) => [{ title, thumbnail: thumbnails[i].concept, score: clamp((scores.ctrPotential + thumbnails[i].score + scores.hookStrength) / 3) }]).sort((a,b)=>b.score-a.score);
  const reasons: string[] = [];
  if (scores.ctrPotential < 85) reasons.push("CTR packaging needs another iteration");
  if (scores.seoOpportunity < 80) reasons.push("SEO opportunity is below the publish threshold");
  if (scores.retentionPotential < 82) reasons.push("Retention structure should be strengthened");
  return { viralScore, scores, titles, thumbnails, combinations, primaryKeyword: keyword, secondaryKeywords: secondary, tags, hashtags, description: `A clear, search-aware overview of ${topic}, with the key ideas, practical takeaways and context viewers need.`, chapters: ["Hook", "Why this matters", "Key points", "What most people miss", "Final takeaway"], publishGate: { ready: reasons.length === 0 && viralScore >= 85, reasons: reasons.length ? reasons : ["Packaging passed the current quality threshold"] } };
}

export async function generateViralPackaging(input: PackagingInput): Promise<PackagingResult> {
  if (!process.env.OPENAI_API_KEY) return fallback(input);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `You are VidForge AI's Viral Packaging Engine. Analyze this YouTube topic and return ONLY valid JSON matching the requested schema. Never promise virality. Optimize ethically for click-through rate, viewer satisfaction, search intent and retention. Avoid deceptive clickbait. Topic: ${input.topic}. Audience: ${input.audience ?? "general"}. Language: ${input.language ?? "English"}. Niche: ${input.niche ?? "general"}. Goal: ${input.goal ?? "growth"}. Return 10 strong titles, 8 thumbnail concepts, 8 title-thumbnail combinations, SEO keywords/tags/hashtags, a useful description, chapters, scores 0-100, and a publish gate with reasons.`;
  const response = await client.responses.create({ model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini", input: prompt });
  const text = response.output_text;
  try { return JSON.parse(text) as PackagingResult; } catch { return fallback(input); }
}
