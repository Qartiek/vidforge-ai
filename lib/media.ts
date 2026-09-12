export interface MediaAsset {
  type: "audio" | "image" | "video" | "visual" | "thumbnail";
  url: string;
  duration?: number;
  provider: string;
  metadata?: Record<string, unknown>;
}

export interface ProductionScene {
  index: number;
  kind: "visual" | "transition" | "overlay";
  start: number;
  end: number;
  prompt: string;
  assetUrl?: string;
  motion?: string;
  transition?: string;
}

export interface ProductionPlan {
  durationSeconds: number;
  scenes: ProductionScene[];
}

export function buildProductionPlan(script: string): ProductionPlan {
  const words = script.trim().split(/\s+/).length;
  const duration = Math.max(30, Math.round(words / 2.4));
  const scenes = Math.max(6, Math.ceil(duration / 8));
  return {
    durationSeconds: duration,
    scenes: Array.from({ length: scenes }, (_, i) => ({
      index: i,
      kind: "visual",
      start: Math.round((i * duration) / scenes),
      end: Math.round(((i + 1) * duration) / scenes),
      prompt: "Video production visual matching the verified script; no invented numbers or logos.",
    })),
  };
}
