-- Establish the core application schema before security/job additions.
-- This migration previously assumed User/Project already existed, which breaks
-- fresh databases (for example a new Vercel preview database).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
    CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'PRO', 'BUSINESS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectStatus') THEN
    CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'QUEUED', 'RESEARCHING', 'SCRIPTING', 'PRODUCING', 'COMPLETE', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobStatus') THEN
    CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL DEFAULT 'REPLACE_DURING_MIGRATION',
  "role" "Role" NOT NULL DEFAULT 'USER',
  "plan" "Plan" NOT NULL DEFAULT 'FREE',
  "credits" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT 'REPLACE_DURING_MIGRATION';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" "Plan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "credits" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId");

CREATE TABLE IF NOT EXISTS "ResearchSource" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "publisher" TEXT,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contentHash" TEXT,
  "content" TEXT NOT NULL,
  CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ResearchSource_projectId_url_key" ON "ResearchSource"("projectId", "url");
CREATE INDEX IF NOT EXISTS "ResearchSource_projectId_fetchedAt_idx" ON "ResearchSource"("projectId", "fetchedAt");

CREATE TABLE IF NOT EXISTS "ResearchFinding" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceId" TEXT,
  "claim" TEXT NOT NULL,
  "evidence" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResearchFinding_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ResearchFinding_projectId_createdAt_idx" ON "ResearchFinding"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "ResearchFinding_sourceId_idx" ON "ResearchFinding"("sourceId");

CREATE TABLE IF NOT EXISTS "ContentScript" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "hook" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "script" TEXT NOT NULL,
  "seoTitle" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "tagsJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentScript_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContentScript_projectId_key" ON "ContentScript"("projectId");

CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "mimeType" TEXT,
  "sceneIndex" INTEGER,
  "duration" DOUBLE PRECISION,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MediaAsset_projectId_sceneIndex_idx" ON "MediaAsset"("projectId", "sceneIndex");

CREATE TABLE IF NOT EXISTS "Job" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "previousJobId" TEXT,
  "type" TEXT NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
  "payload" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "previousJobId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Job_previousJobId_type_key" ON "Job"("previousJobId", "type");
CREATE INDEX IF NOT EXISTS "Job_userId_createdAt_idx" ON "Job"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT,
  "resourceId" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "ip" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

CREATE TABLE IF NOT EXISTS "RateLimit" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "bucket" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RateLimit_key_bucket_idx" ON "RateLimit"("key", "bucket");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_userId_fkey') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResearchSource_projectId_fkey') THEN
    ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResearchFinding_projectId_fkey') THEN
    ALTER TABLE "ResearchFinding" ADD CONSTRAINT "ResearchFinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResearchFinding_sourceId_fkey') THEN
    ALTER TABLE "ResearchFinding" ADD CONSTRAINT "ResearchFinding_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentScript_projectId_fkey') THEN
    ALTER TABLE "ContentScript" ADD CONSTRAINT "ContentScript_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MediaAsset_projectId_fkey') THEN
    ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Job_userId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Job_projectId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_userId_fkey') THEN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
