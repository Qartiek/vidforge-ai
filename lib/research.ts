import { createHash } from "crypto";

export type SourceInput = { url: string; title?: string; publisher?: string };

function isPrivateHost(hostname: string) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h === "0.0.0.0" || h === "::") return true;
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a,b,c,d] = v4.slice(1).map(Number);
    if ([a,b,c,d].some((n) => n > 255)) return true;
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (h.includes(":")) {
    const normalized = h.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }
  return false;
}

export function normalizeUrl(value: string) {
  const u = new URL(value);
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only HTTP(S) sources are allowed");
  if (u.username || u.password) throw new Error("Source URL credentials are not allowed");
  if (isPrivateHost(u.hostname)) throw new Error("Private or local source hosts are not allowed");
  u.hash = "";
  return u.toString();
}

export async function fetchSource(input: SourceInput) {
  let url = normalizeUrl(input.url);
  let response = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "VidForgeAI-Research/1.0" },
    signal: AbortSignal.timeout(12_000),
  });

  for (let redirects = 0; redirects < 3 && response.status >= 300 && response.status < 400; redirects++) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Source redirect missing location");
    url = normalizeUrl(new URL(location, url).toString());
    response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "VidForgeAI-Research/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
  }

  if (response.status >= 300 && response.status < 400) throw new Error("Too many source redirects");
  if (!response.ok) throw new Error("Source fetch failed");

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html") && !type.includes("text/plain") && !type.includes("application/json")) throw new Error("Unsupported source type");
  const raw = (await response.text()).slice(0, 200_000);
  const content = raw.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    url,
    title: input.title || null,
    publisher: input.publisher || new URL(url).hostname,
    content,
    contentHash: createHash("sha256").update(content).digest("hex"),
  };
}
