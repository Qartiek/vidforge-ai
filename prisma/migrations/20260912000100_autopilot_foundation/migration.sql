ALTER TABLE "YouTubePublish" ADD COLUMN "scheduledAt" TIMESTAMP(3);
CREATE INDEX "YouTubePublish_status_scheduledAt_idx" ON "YouTubePublish"("status", "scheduledAt");

CREATE TABLE "AutomationProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Default AutoPilot',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "niche" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'English',
  "cadence" TEXT NOT NULL DEFAULT 'weekly',
  "publishHourUtc" INTEGER NOT NULL DEFAULT 12,
  "videosPerRun" INTEGER NOT NULL DEFAULT 1,
  "autoPublish" BOOLEAN NOT NULL DEFAULT false,
  "privacyStatus" TEXT NOT NULL DEFAULT 'private',
  "nextRunAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AutomationProfile_userId_enabled_idx" ON "AutomationProfile"("userId", "enabled");
CREATE INDEX "AutomationProfile_enabled_nextRunAt_idx" ON "AutomationProfile"("enabled", "nextRunAt");
ALTER TABLE "AutomationProfile" ADD CONSTRAINT "AutomationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AutomationRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "projectId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "topic" TEXT,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AutomationRun_userId_createdAt_idx" ON "AutomationRun"("userId", "createdAt");
CREATE INDEX "AutomationRun_profileId_createdAt_idx" ON "AutomationRun"("profileId", "createdAt");
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AutomationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ContentCalendar" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "publishId" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "title" TEXT NOT NULL,
  "topic" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentCalendar_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContentCalendar_userId_scheduledAt_idx" ON "ContentCalendar"("userId", "scheduledAt");
CREATE INDEX "ContentCalendar_status_scheduledAt_idx" ON "ContentCalendar"("status", "scheduledAt");
ALTER TABLE "ContentCalendar" ADD CONSTRAINT "ContentCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentCalendar" ADD CONSTRAINT "ContentCalendar_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentCalendar" ADD CONSTRAINT "ContentCalendar_publishId_fkey" FOREIGN KEY ("publishId") REFERENCES "YouTubePublish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
