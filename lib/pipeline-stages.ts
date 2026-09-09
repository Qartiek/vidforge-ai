import OpenAI from "openai";
import { db } from "./db";
import { synthesizeSpeech } from "./tts";
import { generateContent } from "./content";
import { buildScriptPrompt } from "./finance";
import { submitRender, validateRenderedAsset } from "./render-worker";
const MAX_TEXT_CHUNK = 3800;
function required(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is not configured`); return value; }
function chunks(text: string) { const out: string[] = []; let remaining = text.trim(); while (remaining.length > MAX_TEXT_CHUNK) { const cut = remaining.lastIndexOf(" ", MAX_TEXT_CHUNK); const at = cut > 500 ? cut : MAX_TEXT_CHUNK; out.push(remaining.slice(0, at)); remaining = remaining.slice(at).trim(); } if (remaining) out.push(remaining); return out; }
async function uploadBinary(bytes: Buffer, filename: string, mimeType: string) {
  const endpoint = required("ASSET_UPLOAD_URL"); const secret = required("ASSET_UPLOAD_SECRET"); const form = new FormData();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  form.append("file", new Blob([arrayBuffer], { type: mimeType }), filename);
  const response = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${secret}` }, body: form, signal: AbortSignal.timeout(120000), cache: "no-store" });
  if (!response.ok) throw new Error(`Asset upload failed (${response.status})`);
  const body = (await response.json().catch(() => null)) as { url?: unknown } | null; if (!body || typeof body.url !== "string") throw new Error("Asset upload response did not contain a URL"); return body.url;
}
async function runVoice(projectId: string, script: string) {
  const parts = chunks(script); const urls: string[] = [];
  for (let i = 0; i < parts.length; i += 1) { const audio = await synthesizeSpeech(parts[i]); const url = await uploadBinary(audio, `voice-${projectId}-${i}.mp3`, "audio/mpeg"); urls.push(url); await db.mediaAsset.create({ data: { projectId, type: "audio", url, provider: "openai-tts", mimeType: "audio/mpeg", sceneIndex: i, metadata: JSON.stringify({ part: i, parts: parts.length }) } }); }
  return { urls };
}
async function runImage(projectId: string, prompt: string, type: "visual" | "thumbnail", sceneIndex?: number) {
  const client = new OpenAI({ apiKey: required("OPENAI_API_KEY") }); const result = await client.images.generate({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2", prompt: prompt.slice(0, 4000), size: "1536x1024", quality: process.env.OPENAI_IMAGE_QUALITY === "low" ? "low" : "medium" });
  const item = result.data?.[0]; if (!item?.b64_json) throw new Error("Image provider returned no image data");
  const url = await uploadBinary(Buffer.from(item.b64_json, "base64"), `${type}-${projectId}-${sceneIndex ?? 0}.png`, "image/png");
  return db.mediaAsset.create({ data: { projectId, type, url, provider: "openai-image", mimeType: "image/png", sceneIndex: sceneIndex ?? null, metadata: JSON.stringify({ prompt: prompt.slice(0, 1000) }) } });
}
export async function executePipelineStage(stage: string, projectId: string, scriptId: string) {
  const project = await db.project.findFirst({ where: { id: projectId }, include: { scripts: true, findings: true, assets: true } });
  const script = project?.scripts[0]; if (!project || !script || script.id !== scriptId) throw new Error("Pipeline project/script mismatch");
  if (stage === "voice") return runVoice(projectId, script.script);
  if (stage === "visuals") {
    const sentences = script.script.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 12); const assets = [];
    for (let i = 0; i < sentences.length; i += 1) assets.push(await runImage(projectId, `Cinematic business documentary visual, no text, factual corporate finance context. Scene: ${sentences[i]}`, "visual", i));
    return { assets: assets.map((asset) => asset.id) };
  }
  if (stage === "thumbnail") { const asset = await runImage(projectId, `High click-through YouTube thumbnail for a serious business finance video about ${project.topic}. Bold visual hierarchy, premium financial news aesthetic, dramatic lighting, one clear focal subject, minimal or no text.`, "thumbnail"); return { assetId: asset.id }; }
  if (stage === "seo") {
    const findings = project.findings.slice(0, 30).map((f) => `${f.claim}: ${f.evidence}`).join("\n");
    const brief = { company: project.topic, angle: "SEO optimization", audience: "general business audience", durationMinutes: 8, language: "English" };
    const generated = await generateContent(brief, buildScriptPrompt(brief, findings || script.script));
    await db.contentScript.update({ where: { id: scriptId }, data: { seoTitle: generated.seoTitle, description: generated.description, tagsJson: JSON.stringify(generated.tags) } }); return { updated: true };
  }
  if (stage === "render") {
    const visualAssets = project.assets.filter((a) => a.type === "visual" || a.type === "image" || a.type === "video").sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
    const audioAssets = project.assets.filter((a) => a.type === "audio").sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0)); if (!visualAssets.length || !audioAssets.length) throw new Error("Render requires visual and voice assets");
    const manifest = { version: 1, format: "mp4", width: 1920, height: 1080, fps: 30, scenes: visualAssets.map((a, i) => ({ index: a.sceneIndex ?? i, assetUrl: a.url })), audio: { source: "tts", urls: audioAssets.map((a) => a.url), codec: "aac" } };
    const outputUrl = validateRenderedAsset(await submitRender({ projectId, manifest, audioUrls: audioAssets.map((a) => a.url), visualUrls: visualAssets.map((a) => a.url) }));
    const row = await db.mediaAsset.create({ data: { projectId, type: "video", url: outputUrl, provider: "render-worker", mimeType: "video/mp4", metadata: JSON.stringify({ rendered: true, manifestVersion: 1 }) } }); return { assetId: row.id, outputUrl };
  }
  if (stage === "publish") {
    const video = [...project.assets].reverse().find((a) => a.type === "video" && a.mimeType === "video/mp4"); if (!video) throw new Error("Publish requires a rendered MP4 asset");
    const idempotencyKey = `pipeline:${projectId}:${video.id}`; const existing = await db.youTubePublish.findUnique({ where: { userId_idempotencyKey: { userId: project.userId, idempotencyKey } }, select: { id: true, status: true } }); if (existing) return { publishId: existing.id, status: existing.status, duplicate: true };
    const privacy = process.env.PIPELINE_YOUTUBE_PRIVACY === "public" ? "public" : process.env.PIPELINE_YOUTUBE_PRIVACY === "unlisted" ? "unlisted" : "private";
    const publish = await db.youTubePublish.create({ data: { userId: project.userId, projectId, idempotencyKey, title: script.title, description: script.description, tagsJson: script.tagsJson, privacyStatus: privacy, assetRef: video.url } });
    const job = await db.job.create({ data: { userId: project.userId, projectId, type: "YOUTUBE_PUBLISH", payload: JSON.stringify({ publishId: publish.id }) } }); return { publishId: publish.id, jobId: job.id, status: publish.status };
  }
  throw new Error(`Unsupported pipeline stage: ${stage}`);
}
