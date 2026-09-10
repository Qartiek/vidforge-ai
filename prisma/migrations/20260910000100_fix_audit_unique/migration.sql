-- Audit logs are append-only events. The previous unique constraint on
-- (action, resourceId) incorrectly prevented repeated legitimate events.
DROP INDEX IF EXISTS "AuditLog_action_resourceId_key";
