export type RepurposeInput = {
  title: string;
  script: string;
  platforms: string[];
  countPerPlatform: number;
};

export type RepurposedContent = {
  platform: string;
  items: Array<{ type: string; content: string; hook: string; cta: string }[]>;
};

export async function generateRepurposedContent(input: RepurposeInput): Promise<RepurposedContent[]> {
  const { default: OpenAI } = await import("openai");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a content repurposing specialist. Create platform-optimized versions of long-form content for shorts, reels, and clips.",
      },
      {
        role: "user",
        content: `Long-form title: ${input.title}\nScript excerpt: ${input.script.slice(0, 1000)}\n\nCreate ${input.countPerPlatform} short-form clips for each of these platforms: ${input.platforms.join(", ")}. Each should have a hook, content excerpt, and CTA. Return valid JSON with platform name as keys, each containing array of items with type, content, hook, and cta.`,
      },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Repurposing AI returned no content");
  try {
    const parsed = JSON.parse(text) as Record<string, Array<{ type: string; content: string; hook: string; cta: string }>>;
    return Object.entries(parsed).map(([platform, items]) => ({ platform, items: [items] }));
  } catch {
    throw new Error("Repurposing AI returned invalid JSON");
  }
}
