import OpenAI from "openai";
import { db } from "./db";
import { fetchSource } from "./research";
import { enqueuePipelineStage } from "./pipeline";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function chooseTopic(niche: string, audience: string, language: string) {
  const client = new OpenAI({ apiKey: required("OPENAI_API_KEY") });
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are an original YouTube topic strategist. Avoid repetitive or mass-produced ideas. Choose a specific, useful topic with a clear viewer promise. Return JSON only." },
      { role: "user", content: `Niche: ${niche}\nAudience: ${audience}\nLanguage: ${language}\nReturn {topic, angle, whyNow}. The topic must be suitable for factual research and a long-form YouTube video.` },
    ],
  });
  const raw = r.choices[0]?.message?.content;
  if (!raw) throw new Error("Topic model returned no content");
  const data = JSON.parse(raw) as { topic?: string; angle?: string; whyNow?: string };
  if (!data.topic?.trim()) throw new Error("Topic model returned no topic");
  return { topic: data.topic.trim().slice(0, 500), angle: String(data.angle || "Explain the topic with evidence, context, trade-offs and practical takeaways").slice(0, 500), whyNow: String(data.whyNow || "").slice(0, 500) };
}

async function discoverSources(topic: string) {
  const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(rss, { headers: { "user-agent": "VidForgeAI-AutoPilot/1.0" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`News discovery failed (${response.status})`);
  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5).map((m) => {
    const block = m[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
    const source = (block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    return { title, link, source };
  }).filter((x) => x.link.startsWith("http"));
  if (!items.length) throw new Error("No current sources found");
  return items;
}

async function createFindings(projectId: string, sources: { title: string; link: string; source: string }[]) {
  const collected: string[] = [];
  for (const item of sources.slice(0, 4)) {
    try {
      const fetched = await fetchSource({ url: item.link, title: item.title, publisher: item.source || undefined });
      const saved = await db.researchSource.upsert({
        where: { projectId_url: { projectId, url: fetched.url } },
        create: { projectId, url: fetched.url, title: fetched.title, publisher: fetched.publisher, contentHash: fetched.contentHash, content: fetched.content },
        update: { title: fetched.title, publisher: fetched.publisher, contentHash: fetched.contentHash, content: fetched.content, fetchedAt: new Date() },
      });
      collected.push(`SOURCE ${saved.id}\nURL: ${fetched.url}\nTITLE: ${fetched.title || item.title}\nTEXT: ${fetched.content.slice(0, 9000)}`);
    } catch { /* skip inaccessible publishers; continue with other sources */ }
  }
  if (!collected.length) throw new Error("All discovered sources were inaccessible");
  const client = new OpenAI({ apiKey: required("OPENAI_API_KEY") });
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Extract only supported factual findings from supplied source text. Return JSON {findings:[{claim,evidence,sourceId,confidence}]}. Never invent facts. Confidence must be 0 to 1 and only use >=0.6 when directly supported." },
      { role: "user", content: collected.join("\n\n").slice(0, 32000) },
    ],
  });
  const raw = r.choices[0]?.message?.content;
  if (!raw) throw new Error("Research model returned no findings");
  const data = JSON.parse(raw) as { findings?: Array<{ claim?: string; evidence?: string; sourceId?: string; confidence?: number }> };
  const valid = (data.findings || []).filter((f) => f.claim && f.evidence && typeof f.confidence === "number" && f.confidence >= 0.6 && f.sourceId);
  if (valid.length < 3) throw new Error("Insufficient verified research findings");
  await db.researchFinding.createMany({ data: valid.slice(0, 20).map((f) => ({ projectId, claim: String(f.claim).slice(0, 2000), evidence: String(f.evidence).slice(0, 10000), confidence: Math.min(1, Math.max(0.6, Number(f.confidence))), sourceId: String(f.sourceId) })) });
  return valid.length;
}

async function createScript(projectId: string, topic: string, angle: string, language: string, audience: string) {
  const findings = await db.researchFinding.findMany({ where: { projectId, confidence: { gte: 0.6 } }, orderBy: { createdAt: "desc" }, take: 30 });
  const research = findings.map((f) => `CLAIM: ${f.claim}\nEVIDENCE: ${f.evidence}\nSOURCE: ${f.sourceId}`).join("\n\n");
  const client = new OpenAI({ apiKey: required("OPENAI_API_KEY") });
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You write original, high-retention YouTube scripts. Use only supplied research for factual claims. Do not copy source wording. Include a strong cold open, clear narrative progression, useful takeaways and a natural CTA. Return JSON with hook,title,script,seoTitle,description,tags." },
      { role: "user", content: `Topic: ${topic}\nAngle: ${angle}\nAudience: ${audience}\nLanguage: ${language}\nResearch:\n${research}` },
    ],
  });
  const raw = r.choices[0]?.message?.content;
  if (!raw) throw new Error("Script model returned no content");
  const data = JSON.parse(raw) as { hook?: string; title?: string; script?: string; seoTitle?: string; description?: string; tags?: string[] };
  if (!data.script?.trim() || !data.title?.trim()) throw new Error("Script model returned incomplete content");
  const script = await db.contentScript.upsert({
    where: { projectId },
    create: { projectId, hook: String(data.hook || ""), title: String(data.title).slice(0, 180), script: String(data.script), seoTitle: String(data.seoTitle || data.title).slice(0, 180), description: String(data.description || "").slice(0, 12000), tagsJson: JSON.stringify(Array.isArray(data.tags) ? data.tags.slice(0, 30) : []) },
    update: { hook: String(data.hook || ""), title: String(data.title).slice(0, 180), script: String(data.script), seoTitle: String(data.seoTitle || data.title).slice(0, 180), description: String(data.description || "").slice(0, 12000), tagsJson: JSON.stringify(Array.isArray(data.tags) ? data.tags.slice(0, 30) : []) },
  });
  return script;
}

export async function runAutoPilotRun(runId: string) {
  const run = await db.automationRun.findUnique({ where: { id: runId }, include: { profile: true } });
  if (!run) throw new Error("Automation run not found");
  const topic = await chooseTopic(run.profile.niche, run.profile.audience, run.profile.language);
  const project = await db.project.create({ data: { userId: run.userId, title: topic.topic.slice(0, 120), topic: topic.topic, status: "RESEARCHING" } });
  await db.automationRun.update({ where: { id: run.id }, data: { projectId: project.id, topic: topic.topic, status: "RUNNING", startedAt: new Date() } });
  const sources = await discoverSources(topic.topic);
  await createFindings(project.id, sources);
  const script = await createScript(project.id, topic.topic, topic.angle, run.profile.language, run.profile.audience);
  const first = await enqueuePipelineStage(run.userId, { projectId: project.id, scriptId: script.id, stage: "creative", metadata: { automationRunId: run.id, autoPublish: run.profile.autoPublish, privacyStatus: run.profile.privacyStatus } });
  return { projectId: project.id, scriptId: script.id, topic: topic.topic, firstJobId: first.id };
}
