ALTER TABLE "RefreshToken"
ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "idleExpiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 hours'),
ADD COLUMN "absoluteExpiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days');

CREATE INDEX "RefreshToken_absoluteExpiresAt_idx" ON "RefreshToken"("absoluteExpiresAt");
CREATE INDEX "RefreshToken_idleExpiresAt_idx" ON "RefreshToken"("idleExpiresAt");
