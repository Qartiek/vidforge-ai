CREATE TYPE "SocialProvider" AS ENUM ('META', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'X');

CREATE TABLE "SocialConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "SocialProvider" NOT NULL,
  "accountId" TEXT NOT NULL,
  "accountName" TEXT,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "scopes" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialConnection_userId_provider_accountId_key" ON "SocialConnection"("userId", "provider", "accountId");
CREATE INDEX "SocialConnection_userId_provider_idx" ON "SocialConnection"("userId", "provider");
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
