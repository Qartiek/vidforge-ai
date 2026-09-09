-- Make Stripe webhook audit-event processing race-safe.
-- resourceId is populated with Stripe event IDs for STRIPE_WEBHOOK records.
CREATE UNIQUE INDEX "AuditLog_action_resourceId_key" ON "AuditLog"("action", "resourceId");
