import OpenAI from "openai";
import { db } from "./db";
import { synthesizeSpeech } from "./tts";
import { buildScriptPrompt, generateContent } from "./content";

const MAX_TEXT_CHUNK = 3800;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function chunks(text: string) {
  const out: string[] = [];
  let remaining = text.trim();
  while (remaining.length > MAX_TEXT_CHUNK) {
    const cut = remaining.lastIndexOf(" ", MAX_TEXT_CHUNK);
    const at = cut > 500 ? cut : MAX_TEXT_CHUNK;
    out.push(remaining.slice(0, at));
    remaining = remaining.slice(at).trim();
  }
  if (remaining) out.push(remaining);
  return out;
}

async function uploadBinary(bytes: Buffer, filename: string, mimeType: string) {
  const endpoint = required("ASSET_UPLOAD_URL");
  const secret = required("ASSET_UPLOAD_SECRET");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), filename);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    body: form,
    signal: AbortSignal.timeout(120000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Asset upload failed (${response.status})`);
  const body = await response.json().catch(() => null) as { url?: unknown } | null;
  if (!body || typeof body.url !== "string") throw new Error("Asset upload response did not contain a URL");
  return body.url;
}

async function runVoice(projectId: string, script: string) {
  const parts = chunks(script);
  const urls: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const audio = await synthesizeSpeech(parts[i]);
    const url = await uploadBinary(audio, `voice-${projectId}-${i}.mp3`, "audio/mpeg");
    urls.push(url);
    await db.mediaAsset.create({
      data: {
        projectId,
        type: "audio",
        url,
        provider: "openai-tts",
        mimeType: "audio/mpeg",
        sceneIndex: i,
        metadata: JSON.stringify({ part: i, parts: parts.length }),
      },
    });
  }
  return { urls };
}

async function runImage(projectId: string, prompt: string, type: "visual" | "thumbnail", sceneIndex?: number) {
  const client = new OpenAI({ apiKey: required("OPENAI_API_KEY") });
  const result = await client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    prompt: prompt.slice(0, 4000),
    size: type === "thumbnail" ? "1536x1024" : "1536x1024",
    quality: process.env.OPENAI_IMAGE_QUALITY === "low" ? "low" : "medium",
  });
  const item = result.data?.[0];
  if (!item?.b64_json) throw new Error("Image provider returned no image data");
  const url = await uploadBinary(Buffer.from(item.b64_json, "base64"), `${type}-${projectId}-${sceneIndex ?? 0}.png`, "image/png");
  const row = await db.mediaAsset.create({
    data: {
      projectId,
      type,
      url,
      provider: "openai-image",
      mimeType: "image/png",
      sceneIndex: sceneIndex ?? null,
      metadata: JSON.stringify({ prompt: prompt.slice(0, 1000) }),
    },
  });
  return row;
}

export async function executePipelineStage(stage: string, projectId: string, scriptId: string) {
  const project = await db.project.findFirst({ where: { id: projectId }, include: { scripts: true, findings: true } });
  if (!project || !project.scripts || project.scripts.id !== scriptId) throw new Error("Pipeline project/script mismatch");

  if (stage === "voice") return runVoice(projectId, project.scripts.script);

  if (stage === "visuals") {
    const sentences = project.scripts.script.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 12);
    const assets = [];
    for (let i = 0; i < sentences.length; i += 1) {
      assets.push(await runImage(projectId, `Cinematic business documentary visual, no text, factual corporate finance context. Scene: ${sentences[i]}`, "visual", i));
    }
    return { assets: assets.map((asset) => asset.id) };
  }

  if (stage === "thumbnail") {
    const asset = await runImage(projectId, `High click-through YouTube thumbnail for a serious business finance video about ${project.topic}. Bold visual hierarchy, premium financial news aesthetic, dramatic lighting, one clear focal subject, minimal or no text.`, "thumbnail");
    return { assetId: asset.id };
  }

  if (stage === "seo") {
    const findings = project.findings.slice(0, 30).map((f) => `${f.claim}: ${f.evidence}`).join("\n");
    const generated = await generateContent(buildScriptPrompt({ company: project.topic, angle: "SEO optimization", audience: "general business audience", durationMinutes: 8, language: "English", sources: findings || "Use the existing verified script only" }));
    await db.contentScript.update({ where: { id: scriptId }, data: { seoTitle: generated.seoTitle, description: generated.description, tagsJson: generated.tags.join(",") } });
    return { updated: true };
  }

  if (stage === "render") {
    throw new Error("Render worker requires the media execution runtime; ffmpeg must run outside the Vercel request process");
  }

  if (stage === "publish") {
    throw new Error("Publish stage requires an explicit YouTube publish job and assetRef; render output is not available yet");
  }

  throw new Error(`Unsupported pipeline stage: ${stage}`);
}
