// v2 is kept as a compatibility endpoint while the canonical durable worker
// lives at /api/worker/pipeline. Keeping a single implementation prevents
// stage-order and approval-gate drift.
export { POST } from "../pipeline/route";
export const runtime = "nodejs";
