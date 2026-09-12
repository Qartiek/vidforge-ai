import OpenAI from "openai";
import { db } from "./db";
import { synthesizeSpeech } from "./tts";
import { submitRender, validateRenderedAsset } from "./render-worker";
import { generateRepurposedContent } from "./repurpose";
import { runContentQualityChecks } from "./quality-engine";

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
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  form.append("file", new Blob([arrayBuffer], { type: mimeType }), filename);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    body: form,
    signal: AbortSignal.timeout(120000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Asset upload failed (${response.status})`);
  const body = (await response.json().catch(() => null)) as { url?: unknown } | null;
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
    size: "1536x1024",
    quality: process.env.OPENAI_IMAGE_QUALITY === "low" ? "low" : "medium",
  });
  const item = result.data?.[0];
  if (!item?.b64_json) throw new Error("Image provider returned no image data");
  const url = await uploadBinary(
    Buffer.from(item.b64_json, "base64"),
    `${type}-${projectId}-${sceneIndex ?? 0}.png`,
    "image/png"
  );
  return db.mediaAsset.create({
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
}

async function generateSeo(projectId: string, scriptId: string, topic: string, title: string, scriptText: string) {
  const client = new OpenAI({ apiKey: required("OPENAI_API_KEY") });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a YouTube SEO expert. Create compelling titles, descriptions, and tags that maximize CTR and discoverability.",
      },
      {
        role: "user",
        content: `Topic: ${topic}\nVideo Title: ${title}\nScript excerpt: ${scriptText.slice(0, 500)}\n\nGenerate SEO metadata. Return JSON with keys: seoTitle (60 chars max), description (300-500 chars), tags (12-15 relevant tags).`,
      },
    ],
  });
  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("SEO model returned no content");
  const data = JSON.parse(raw) as { seoTitle?: string; description?: string; tags?: string[] };
  await db.contentScript.update({
    where: { id: scriptId },
    data: {
      seoTitle: String(data.seoTitle || title).slice(0, 180),
      description: String(data.description || "").slice(0, 12000),
      tagsJson: JSON.stringify(data.tags || []),
    },
  });
  return data;
}

async function getVideoRenderSettings(userId: string, aspectRatio: string, projectDurationSeconds: number) {
  const rows = await db.$queryRaw<Array<{ data: unknown }>>`SELECT "data" FROM "UserSettings" WHERE "userId" = ${userId} LIMIT 1`;
  const root = rows[0]?.data;
  const data = root && typeof root === "object" ? root as Record<string, unknown> : {};
  const video = data.video && typeof data.video === "object" ? data.video as Record<string, unknown> : {};
  const savedQuality = String(video.quality || "1080p Full HD");
  const savedAspect = String(video.aspectRatio || aspectRatio || "16:9");
  const savedFps = Number(video.fps || 30);
  const quality = savedQuality === "4K" || savedQuality === "4K UHD" ? "4K UHD" : savedQuality === "1440p 2K" ? "1440p 2K" : savedQuality === "720p HD" ? "720p HD" : "1080p Full HD";
  const fps = [24, 30, 60].includes(savedFps) ? savedFps : 30;
  const ratio = ["16:9", "9:16", "1:1", "4:5"].includes(savedAspect) ? savedAspect : "16:9";
  const heights: Record<string, number> = { "720p HD": 720, "1080p Full HD": 1080, "1440p 2K": 1440, "4K UHD": 2160 };
  const height = heights[quality];
  const dimensions: Record<string, [number, number]> = {
    "16:9": [Math.round(height * 16 / 9), height],
    "9:16": [height, Math.round(height * 16 / 9)],
    "1:1": [height, height],
    "4:5": [Math.round(height * 4 / 5), height],
  };
  const [width, finalHeight] = dimensions[ratio];
  return {
    format: "mp4",
    container: "mp4",
    codec: "h264",
    pixelFormat: "yuv420p",
    quality,
    width,
    height: finalHeight,
    fps,
    durationSeconds: Math.max(1, projectDurationSeconds),
    audioCodec: "aac",
  };
}

export async function executePipelineStage(stage: string, projectId: string, scriptId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId },
    include: { scripts: true, findings: true, assets: true },
  });
  const script = project?.scripts[0];
  if (!project || !script || script.id !== scriptId) throw new Error("Pipeline project/script mismatch");

  if (stage === "research")
    return {
      status: "ready",
      findings: project.findings.length,
      message: project.findings.length ? "Stored research findings available for content generation." : "Research findings pending.",
    };
  if (stage === "content") return { status: "ready", scriptId: script.id, message: "Hook-led content package already generated." };
  if (stage === "creative" || stage === "thumbnail" || stage === "title_thumbnail") {
    const asset = await runImage(
      projectId,
      `High-click-through YouTube thumbnail for: ${project.topic}. Video title: ${script.title}. Strong visual hierarchy, one clear focal subject, emotionally resonant.`,
      "thumbnail"
    );
    return { assetId: asset.id };
  }
  if (stage === "voice" || stage === "voiceover") return runVoice(projectId, script.script);
  if (stage === "visuals") {
    const sentences = script.script.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 12);
    const assets = [];
    for (let i = 0; i < sentences.length; i += 1)
      assets.push(
        await runImage(
          projectId,
          `Cinematic visual for a ${project.topic} video. Create a compelling, accurate scene inspired by this narrative line: "${sentences[i]}"`,
          "visual",
          i
        )
      );
    return { assets: assets.map((asset) => asset.id) };
  }
  if (stage === "seo") return generateSeo(projectId, scriptId, project.topic, script.title, script.script);
  if (stage === "repurpose" || stage === "shorts_reels") {
    const generated = await generateRepurposedContent({
      title: script.title,
      script: script.script,
      platforms: ["YouTube", "Instagram", "Facebook", "TikTok"],
      countPerPlatform: 3,
    });
    const job = await db.job.create({
      data: {
        userId: project.userId,
        projectId,
        type: "SHORTS_REPURPOSE",
        status: "SUCCEEDED",
        payload: JSON.stringify({ items: generated }),
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
    return { jobId: job.id, items: generated };
  }
  if (stage === "captions") {
    return {
      status: "ready",
      provider: "render-worker",
      source: "script",
      message: "Caption track will be generated during final render.",
    };
  }
  if (stage === "editing" || stage === "render") {
    const visualAssets = project.assets
      .filter((a) => ["visual", "image", "video"].includes(a.type))
      .sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
    const audioAssets = project.assets.filter((a) => a.type === "audio").sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
    if (!visualAssets.length || !audioAssets.length) throw new Error("Render requires visual and voice assets");
    const renderSettings = await getVideoRenderSettings(project.userId, "16:9", Math.max(1, Number(project.durationSeconds || 60)));
    const manifest = {
      version: 3,
      format: "mp4",
      container: "mp4",
      codec: "h264",
      pixelFormat: "yuv420p",
      quality: renderSettings.quality,
      width: renderSettings.width,
      height: renderSettings.height,
      fps: renderSettings.fps,
      durationSeconds: renderSettings.durationSeconds,
      scenes: visualAssets.map((a, i) => ({
        index: a.sceneIndex ?? i,
        assetUrl: a.url,
        motion: "ken-burns",
        transition: "crossfade",
        duration: 4,
      })),
      audio: { urls: audioAssets.map((a) => a.url), format: "aac", codec: "aac" },
      captions: { enabled: true, format: "srt", source: "script" },
    };
    const outputUrl = validateRenderedAsset(
      await submitRender({
        projectId,
        manifest,
        audioUrls: audioAssets.map((a) => a.url),
        visualUrls: visualAssets.map((a) => a.url),
      })
    );
    const row = await db.mediaAsset.create({
      data: {
        projectId,
        type: "video",
        url: outputUrl,
        provider: "render-worker",
        mimeType: "video/mp4",
        metadata: JSON.stringify({ rendered: true, manifest }),
      },
    });
    return { assetId: row.id, outputUrl, format: "mp4", quality: renderSettings.quality, width: renderSettings.width, height: renderSettings.height, fps: renderSettings.fps };
  }
  if (stage === "quality") {
    const check = runContentQualityChecks({
      title: script.title,
      script: script.script,
      description: script.description,
    });
    const job = await db.job.create({
      data: {
        userId: project.userId,
        projectId,
        type: "QUALITY_CHECK",
        status: "SUCCEEDED",
        payload: JSON.stringify(check),
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
    return { jobId: job.id, ...check };
  }
  if (stage === "analytics") {
    return {
      status: "deferred",
      message: "Analytics job is created automatically after successful YouTube publication.",
    };
  }
  if (stage === "publish" || stage === "schedule_publish") {
    const video = [...project.assets].reverse().find((a) => a.type === "video" && a.mimeType === "video/mp4");
    if (!video) throw new Error("Publish requires a rendered MP4 asset");
    const idempotencyKey = `pipeline:${projectId}:${video.id}`;
    const existing = await db.youTubePublish.findUnique({
      where: { userId_idempotencyKey: { userId: project.userId, idempotencyKey } },
      select: { id: true, status: true },
    });
    if (existing) return { publishId: existing.id, status: existing.status, idempotent: true };
    const privacy = process.env.PIPELINE_YOUTUBE_PRIVACY === "public" ? "public" : process.env.PIPELINE_YOUTUBE_PRIVACY === "unlisted" ? "unlisted" : "private";
    const publish = await db.youTubePublish.create({
      data: {
        userId: project.userId,
        projectId,
        idempotencyKey,
        title: script.title,
        description: script.description,
        tagsJson: script.tagsJson,
        privacyStatus: privacy,
        assetRef: video.url,
      },
    });
    return { publishId: publish.id, status: publish.status, prepared: true };
  }
  throw new Error(`Unsupported pipeline stage: ${stage}`);
}
