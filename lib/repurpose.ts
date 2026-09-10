import OpenAI from "openai";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export type RepurposeInput = {
  title: string;
  script: string;
  platforms: string[];
  countPerPlatform?: number;
};

export async function generateRepurposedContent(input: RepurposeInput) {
  const client = new OpenAI({ apiKey: required("OPENAI_API_KEY") });
  const count = Math.min(Math.max(input.countPerPlatform ?? 5, 1), 10);
  const prompt = `You are VidForge AI's short-form repurposing engine. Convert the source content into platform-native short-form ideas. Keep every hook INSIDE each short script. Do not invent factual claims that are not supported by the source. Return strict JSON only with key "items". Each item: {"platform":"Instagram|Facebook|YouTube","format":"Reel|Short","hook":"...","script":"...","caption":"...","hashtags":["..."]}. Create ${count} items for each requested platform. Source title: ${input.title}. Platforms: ${input.platforms.join(", ")}. Source script:\n${input.script.slice(0, 18000)}`;
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: "You produce concise, platform-native short-form content." }, { role: "user", content: prompt }],
  });
  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Repurposing model returned no content");
  const parsed = JSON.parse(raw) as { items?: unknown };
  if (!Array.isArray(parsed.items)) throw new Error("Repurposing response is invalid");
  return parsed.items;
}
