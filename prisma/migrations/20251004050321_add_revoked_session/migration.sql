-- CreateTable
CREATE TABLE "RevokedSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevokedSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevokedSession_sessionToken_key" ON "RevokedSession"("sessionToken");

-- CreateIndex
CREATE INDEX "RevokedSession_sessionToken_idx" ON "RevokedSession"("sessionToken");

-- CreateIndex
CREATE INDEX "RevokedSession_userId_idx" ON "RevokedSession"("userId");

-- CreateIndex
CREATE INDEX "RevokedSession_expiresAt_idx" ON "RevokedSession"("expiresAt");
