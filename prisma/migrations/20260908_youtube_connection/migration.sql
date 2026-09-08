CREATE TABLE "YouTubeConnection" (
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
  CONSTRAINT "YouTubeConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "YouTubeConnection_userId_key" UNIQUE ("userId"),
  CONSTRAINT "YouTubeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
