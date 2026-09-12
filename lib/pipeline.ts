import { db } from "./db";

export const PIPELINE_STAGES = [
  "research", "content", "creative", "voice", "visuals", "editing",
  "captions", "seo", "repurpose", "quality", "publish", "analytics",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type PipelinePayload = {
  projectId: string;
  scriptId: string;
  stage: PipelineStage;
  previousJobId?: string;
  metadata?: Record<string, unknown>;
};

export function nextPipelineStage(stage: PipelineStage): PipelineStage | null {
  const index = PIPELINE_STAGES.indexOf(stage);
  return index >= 0 && index < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[index + 1] : null;
}

export async function enqueuePipelineStage(userId: string, payload: PipelinePayload) {
  const type = `pipeline:${payload.stage}`;

  if (payload.previousJobId) {
    const existing = await db.job.findUnique({
      where: { previousJobId_type: { previousJobId: payload.previousJobId, type } },
    });
    if (existing) return existing;
  } else {
    const existing = await db.job.findFirst({
      where: { userId, projectId: payload.projectId, type, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;
  }

  try {
    return await db.job.create({
      data: {
        userId,
        projectId: payload.projectId,
        previousJobId: payload.previousJobId,
        type,
        status: "QUEUED",
        payload: JSON.stringify(payload),
      },
    });
  } catch (error) {
    if (payload.previousJobId && error instanceof Error && "code" in error && error.code === "P2002") {
      const existing = await db.job.findUnique({
        where: { previousJobId_type: { previousJobId: payload.previousJobId, type } },
      });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function advancePipeline(jobId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || !job.projectId) throw new Error("Pipeline job not found");
  const payload = JSON.parse(job.payload) as PipelinePayload;
  const next = nextPipelineStage(payload.stage);
  if (!next) {
    await db.project.update({ where: { id: job.projectId }, data: { status: "COMPLETE" } });
    return null;
  }
  return enqueuePipelineStage(job.userId, { projectId: job.projectId, scriptId: payload.scriptId, stage: next, previousJobId: job.id, metadata: payload.metadata });
}
