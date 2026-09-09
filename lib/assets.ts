import { createHash } from "crypto";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4"]);
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function allowedHost(): string {
  const raw = process.env.ASSET_STORAGE_HOST?.trim();
  if (!raw) throw new Error("ASSET_STORAGE_HOST is required");
  try {
    const value = raw.includes("://") ? new URL(raw).hostname : raw.split("/")[0].split(":")[0];
    if (!value || value.includes("@")) throw new Error("Invalid ASSET_STORAGE_HOST");
    return value.toLowerCase().replace(/\.$/, "");
  } catch {
    throw new Error("Invalid ASSET_STORAGE_HOST");
  }
}

export function validateAssetUrl(value: string) {
  const u = new URL(value);
  if (u.protocol !== "https:") throw new Error("Only HTTPS asset URLs are allowed");
  if (u.username || u.password) throw new Error("Asset URL credentials are not allowed");
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host !== allowedHost()) throw new Error("Asset host is not allowed");
  return u.toString();
}

export async function acquireAsset(url: string) {
  let current = validateAssetUrl(url);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const r = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "VidForgeAI-Asset/1.0" },
    });

    if (r.status >= 300 && r.status < 400) {
      const location = r.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) throw new Error("Too many asset redirects");
      current = validateAssetUrl(new URL(location, current).toString());
      continue;
    }

    if (!r.ok) throw new Error("Asset download failed");

    const contentLength = Number(r.headers.get("content-length") || 0);
    if (contentLength > MAX_ASSET_BYTES) throw new Error("Asset exceeds 25MB limit");

    const type = (r.headers.get("content-type") || "").split(";")[0].toLowerCase();
    if (!allowed.has(type)) throw new Error("Unsupported asset MIME type");

    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length > MAX_ASSET_BYTES) throw new Error("Asset exceeds 25MB limit");

    return {
      url: current,
      mimeType: type,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }

  throw new Error("Asset download failed");
}

export function buildAssetQuery(prompt: string) {
  return prompt.replace(/https?:\/\/\S+/g, "").slice(0, 300);
}
