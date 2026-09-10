import { db } from "./db";

const ORDER = ["research","content","creative","voice","visuals","editing","captions","seo","repurpose","quality","publish","analytics"] as const;
export type PipelineStage = (typeof ORDER)[number];

export function stageIndex(stage: string) { return ORDER.indexOf(stage as PipelineStage); }

function stageFromType(type: string) {
  if (type.startsWith("pipeline:")) return type.slice("pipeline:".length);
  if (type.startsWith("PIPELINE_")) return type.replace("PIPELINE_", "").toLowerCase();
  return null;
}

export async function getPipelineState(projectId: string, userId: string) {
  const jobs = await db.job.findMany({ where: { projectId, userId, OR: [{ type: { startsWith: "pipeline:" } }, { type: { startsWith: "PIPELINE_" } }, { type: "production_pipeline" }] }, orderBy: { createdAt: "asc" }, select: { id: true, type: true, status: true, attempts: true, error: true, createdAt: true, startedAt: true, finishedAt: true } });
  const completed = jobs.map(j => j.status === "SUCCEEDED" ? stageFromType(j.type) : null).filter((s): s is string => Boolean(s));
  const failed = jobs.map(j => j.status === "FAILED" ? stageFromType(j.type) : null).filter((s): s is string => Boolean(s));
  const running = jobs.map(j => j.status === "RUNNING" ? stageFromType(j.type) : null).filter((s): s is string => Boolean(s));
  const current = running[0] || failed[0] || ORDER.find(s => !completed.includes(s)) || "complete";
  return { stages: ORDER, completed, failed, running, current, progress: Math.round((completed.length / ORDER.length) * 100), jobs };
}

export function nextStage(completed: string[]) { return ORDER.find(stage => !completed.includes(stage)) || null; }
