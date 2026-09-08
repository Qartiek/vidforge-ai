import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";

const MAX_BYTES = Number(process.env.MAX_VIDEO_ASSET_BYTES ?? 2147483648);

function allowedHost() {
  const host = process.env.ASSET_STORAGE_HOST;
  if (!host) throw new Error("ASSET_STORAGE_HOST is required");
  return host.toLowerCase();
}

function validateAssetRef(assetRef: string) {
  if (assetRef.length > 500 || /[\\\r\n]/.test(assetRef)) throw new Error("Invalid asset reference");
  if (!/^https:\/\//i.test(assetRef)) throw new Error("Asset reference must use HTTPS");
  const url = new URL(assetRef);
  if (url.username || url.password) throw new Error("Asset URL credentials are not allowed");
  if (url.hostname.toLowerCase() !== allowedHost()) throw new Error("Asset host is not allowed");
  return url;
}

export async function materializeVideoAsset(assetRef: string, publishId: string) {
  const url = validateAssetRef(assetRef);
  const base = path.join("/tmp", "vidforge-assets");
  await mkdir(base, { recursive: true, mode: 0o700 });
  const file = path.join(base, `${publishId}.mp4`);
  const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new Error(`Asset download failed (${response.status})`);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error("Video asset exceeds the configured size limit");
  if (response.headers.get("content-type") && !response.headers.get("content-type")!.toLowerCase().startsWith("video/")) throw new Error("Asset is not a video");
  const stream = createWriteStream(file, { mode: 0o600, flags: "wx" });
  let received = 0;
  const limited = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({ transform(chunk, controller) { received += chunk.byteLength; if (received > MAX_BYTES) { controller.error(new Error("Video asset exceeds the configured size limit")); return; } controller.enqueue(chunk); } }));
  try { await pipeline(limited, stream); } catch (error) { await rm(file, { force: true }); throw error; }
  const info = await stat(file);
  if (info.size === 0) { await rm(file, { force: true }); throw new Error("Video asset is empty"); }
  return { file, size: info.size, host: url.hostname };
}

export async function removeMaterializedAsset(file: string) {
  const root = path.resolve("/tmp/vidforge-assets");
  const target = path.resolve(file);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid asset path");
  await rm(target, { force: true });
}
