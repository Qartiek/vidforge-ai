CREATE TYPE "PublishStatus" AS ENUM ('QUEUED', 'UPLOADING', 'PUBLISHED', 'FAILED');

CREATE TABLE "YouTubePublish" (
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

CREATE UNIQUE INDEX "YouTubePublish_userId_idempotencyKey_key" ON "YouTubePublish"("userId", "idempotencyKey");
CREATE INDEX "YouTubePublish_userId_createdAt_idx" ON "YouTubePublish"("userId", "createdAt");

ALTER TABLE "YouTubePublish" ADD CONSTRAINT "YouTubePublish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YouTubePublish" ADD CONSTRAINT "YouTubePublish_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
