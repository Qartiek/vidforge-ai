import { db } from "./db";

export type PipelineJobType = "PIPELINE_STAGE" | "PIPELINE_BATCH";

export async function createPipelineJob(userId: string, projectId: string, scriptId: string, stage: string, payload: unknown = {}) {
  return db.job.create({
    data: {
      userId,
      projectId,
      type: `PIPELINE_${stage.toUpperCase()}`,
      status: "QUEUED",
      payload: JSON.stringify({ scriptId, stage, ...((payload && typeof payload === "object") ? payload : {}) }),
    },
  });
}

export async function markJobRunning(jobId: string) {
  return db.job.update({ where: { id: jobId }, data: { status: "RUNNING", startedAt: new Date() } });
}

export async function markJobSucceeded(jobId: string, result: unknown = {}) {
  return db.job.update({ where: { id: jobId }, data: { status: "SUCCEEDED", finishedAt: new Date(), payload: JSON.stringify({ result }) } });
}

export async function markJobFailed(jobId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return db.job.update({ where: { id: jobId }, data: { status: "FAILED", finishedAt: new Date(), payload: JSON.stringify({ error: message.slice(0, 2000) }) } });
}
