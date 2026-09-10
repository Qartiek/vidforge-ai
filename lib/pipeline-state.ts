import { db } from "./db";

const ORDER = ["research","content","creative","voice","visuals","editing","captions","seo","repurpose","quality","publish","analytics"] as const;
export type PipelineStage = (typeof ORDER)[number];

export function stageIndex(stage: string) { return ORDER.indexOf(stage as PipelineStage); }

export async function getPipelineState(projectId: string, userId: string) {
  const jobs = await db.job.findMany({ where: { projectId, userId, type: { startsWith: "PIPELINE_" } }, orderBy: { createdAt: "asc" }, select: { id: true, type: true, status: true, attempts: true, error: true, createdAt: true, startedAt: true, finishedAt: true } });
  const completed = jobs.filter(j => j.status === "SUCCEEDED").map(j => j.type.replace("PIPELINE_", "").toLowerCase());
  const failed = jobs.filter(j => j.status === "FAILED").map(j => j.type.replace("PIPELINE_", "").toLowerCase());
  const running = jobs.filter(j => j.status === "RUNNING").map(j => j.type.replace("PIPELINE_", "").toLowerCase());
  const current = running[0] || failed[0] || ORDER.find(s => !completed.includes(s)) || "complete";
  return { stages: ORDER, completed, failed, running, current, progress: Math.round((completed.length / ORDER.length) * 100), jobs };
}

export function nextStage(completed: string[]) { return ORDER.find(stage => !completed.includes(stage)) || null; }
