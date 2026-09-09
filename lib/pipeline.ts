import { db } from "./db";

export const PIPELINE_STAGES = ["voice", "visuals", "render", "thumbnail", "seo", "publish"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type PipelinePayload = {
  projectId: string;
  scriptId: string;
  stage: PipelineStage;
  previousJobId?: string;
  metadata?: Record<string, unknown>;
};

const nextStage = (stage: PipelineStage): PipelineStage | null => {
  const index = PIPELINE_STAGES.indexOf(stage);
  return index >= 0 && index < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[index + 1] : null;
};

export async function enqueuePipelineStage(userId: string, payload: PipelinePayload) {
  const existing = await db.job.findFirst({
    where: { userId, projectId: payload.projectId, type: `pipeline:${payload.stage}`, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return db.job.create({ data: { userId, projectId: payload.projectId, type: `pipeline:${payload.stage}`, status: "QUEUED", payload: JSON.stringify(payload) } });
}

export async function advancePipeline(jobId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || !job.projectId) throw new Error("Pipeline job not found");
  const payload = JSON.parse(job.payload) as PipelinePayload;
  const next = nextStage(payload.stage);
  if (!next) {
    await db.project.update({ where: { id: job.projectId }, data: { status: "COMPLETE" } });
    return null;
  }
  return enqueuePipelineStage(job.userId, { projectId: job.projectId, scriptId: payload.scriptId, stage: next, previousJobId: job.id, metadata: payload.metadata });
}
