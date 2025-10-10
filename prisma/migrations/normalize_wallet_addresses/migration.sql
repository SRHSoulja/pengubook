-- Normalize existing wallet addresses to lowercase
UPDATE "User"
SET "walletAddress" = LOWER("walletAddress")
WHERE "walletAddress" IS NOT NULL AND "walletAddress" != LOWER("walletAddress");

-- Add check constraint to enforce lowercase wallet addresses
ALTER TABLE "User"
ADD CONSTRAINT "wallet_address_lowercase_check"
CHECK ("walletAddress" IS NULL OR "walletAddress" = LOWER("walletAddress"));

-- Also normalize in AuthNonce table
UPDATE "AuthNonce"
SET "walletAddress" = LOWER("walletAddress")
WHERE "walletAddress" IS NOT NULL AND "walletAddress" != LOWER("walletAddress");

-- Also normalize in AuthAttempt table
UPDATE "AuthAttempt"
SET "walletAddress" = LOWER("walletAddress")
WHERE "walletAddress" IS NOT NULL AND "walletAddress" != LOWER("walletAddress");
