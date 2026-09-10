CREATE TABLE "YouTubeAnalytics" (
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

CREATE INDEX "YouTubeAnalytics_userId_fetchedAt_idx" ON "YouTubeAnalytics"("userId", "fetchedAt");
CREATE INDEX "YouTubeAnalytics_publishId_fetchedAt_idx" ON "YouTubeAnalytics"("publishId", "fetchedAt");
ALTER TABLE "YouTubeAnalytics" ADD CONSTRAINT "YouTubeAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YouTubeAnalytics" ADD CONSTRAINT "YouTubeAnalytics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YouTubeAnalytics" ADD CONSTRAINT "YouTubeAnalytics_publishId_fkey" FOREIGN KEY ("publishId") REFERENCES "YouTubePublish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
