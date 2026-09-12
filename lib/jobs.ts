export type JobType =
  | "research"
  | "content"
  | "content_generation"
  | "voice"
  | "voiceover"
  | "visuals"
  | "visual"
  | "rendering"
  | "render"
  | "editing"
  | "thumbnail"
  | "seo"
  | "publish"
  | "YOUTUBE_PUBLISH"
  | "production_pipeline"
  | "ANALYTICS_OPTIMIZATION"
  | "QUALITY_CHECK"
  | "SHORTS_REPURPOSE";

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export function createJob(type: JobType): Job {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type,
    status: "QUEUED",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function nextJobStatus(status: JobStatus): JobStatus | null {
  if (status === "QUEUED") return "RUNNING";
  if (status === "RUNNING") return "SUCCEEDED";
  return null;
}

export function canRetry(attempts: number, maxAttempts = 5) {
  return attempts < maxAttempts;
}
