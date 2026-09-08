import { db } from "./db";

export async function audit(input: { userId?: string | null; action: string; resource?: string; resourceId?: string; success?: boolean; ip?: string; metadata?: Record<string, unknown> }) {
  return db.auditLog.create({ data: { userId: input.userId ?? null, action: input.action, resource: input.resource ?? null, resourceId: input.resourceId ?? null, success: input.success ?? true, ip: input.ip ?? null, metadata: input.metadata ? JSON.stringify(input.metadata) : null } });
}
