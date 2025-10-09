-- CreateTable
CREATE TABLE "csrf_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csrf_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "csrf_tokens_token_key" ON "csrf_tokens"("token");

-- CreateIndex
CREATE INDEX "csrf_tokens_token_used_idx" ON "csrf_tokens"("token", "used");

-- CreateIndex
CREATE INDEX "csrf_tokens_expiresAt_idx" ON "csrf_tokens"("expiresAt");
