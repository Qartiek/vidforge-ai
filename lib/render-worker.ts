const MAX_BYTES = 2 * 1024 * 1024 * 1024;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export type RenderRequest = {
  projectId: string;
  manifest: unknown;
  audioUrls: string[];
  visualUrls: string[];
};

export async function submitRender(request: RenderRequest) {
  const endpoint = required("RENDER_WORKER_URL");
  const secret = required("RENDER_WORKER_SECRET");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Render worker rejected request (${response.status})`);
  const body = await response.json().catch(() => null) as { outputUrl?: unknown } | null;
  if (!body || typeof body.outputUrl !== "string") throw new Error("Render worker returned no output URL");
  return body.outputUrl;
}

export function validateRenderedAsset(url: string) {
  const u = new URL(url);
  const configured = new URL(required("ASSET_STORAGE_HOST").includes("://") ? required("ASSET_STORAGE_HOST") : `https://${required("ASSET_STORAGE_HOST")}`);
  if (u.protocol !== "https:" || u.hostname.toLowerCase() !== configured.hostname.toLowerCase()) {
    throw new Error("Rendered asset host is not allowed");
  }
  return u.toString();
}

export { MAX_BYTES };
