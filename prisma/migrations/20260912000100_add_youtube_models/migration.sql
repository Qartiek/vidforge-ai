-- Bring the migration history in sync with prisma/schema.prisma.
-- These models were present in the schema but missing from migrations.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PublishStatus') THEN
    CREATE TYPE "PublishStatus" AS ENUM ('QUEUED', 'UPLOADING', 'PUBLISHED', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "YouTubeConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelId" TEXT,
  "channelTitle" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "YouTubeConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "YouTubeConnection_userId_key" ON "YouTubeConnection"("userId");

CREATE TABLE IF NOT EXISTS "YouTubePublish" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "youtubeVideoId" TEXT,
  "status" "PublishStatus" NOT NULL DEFAULT 'QUEUED',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "tagsJson" TEXT,
  "privacyStatus" TEXT NOT NULL DEFAULT 'private',
  "assetRef" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "YouTubePublish_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "YouTubePublish_userId_idempotencyKey_key" ON "YouTubePublish"("userId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "YouTubePublish_userId_createdAt_idx" ON "YouTubePublish"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "YouTubeAnalytics" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "publishId" TEXT NOT NULL,
  "youtubeVideoId" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "comments" INTEGER NOT NULL DEFAULT 0,
  "watchTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "averageViewDurationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "averageViewPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "recommendationsJson" TEXT,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "YouTubeAnalytics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "YouTubeAnalytics_userId_fetchedAt_idx" ON "YouTubeAnalytics"("userId", "fetchedAt");
CREATE INDEX IF NOT EXISTS "YouTubeAnalytics_publishId_fetchedAt_idx" ON "YouTubeAnalytics"("publishId", "fetchedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'YouTubeConnection_userId_fkey') THEN
    ALTER TABLE "YouTubeConnection" ADD CONSTRAINT "YouTubeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'YouTubePublish_userId_fkey') THEN
    ALTER TABLE "YouTubePublish" ADD CONSTRAINT "YouTubePublish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'YouTubePublish_projectId_fkey') THEN
    ALTER TABLE "YouTubePublish" ADD CONSTRAINT "YouTubePublish_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'YouTubeAnalytics_userId_fkey') THEN
    ALTER TABLE "YouTubeAnalytics" ADD CONSTRAINT "YouTubeAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'YouTubeAnalytics_projectId_fkey') THEN
    ALTER TABLE "YouTubeAnalytics" ADD CONSTRAINT "YouTubeAnalytics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'YouTubeAnalytics_publishId_fkey') THEN
    ALTER TABLE "YouTubeAnalytics" ADD CONSTRAINT "YouTubeAnalytics_publishId_fkey" FOREIGN KEY ("publishId") REFERENCES "YouTubePublish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
