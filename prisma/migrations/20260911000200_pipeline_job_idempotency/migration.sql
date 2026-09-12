-- Make pipeline child-job creation idempotent by tying each child to its parent job.
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "previousJobId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Job_previousJobId_type_key" ON "Job"("previousJobId", "type");
