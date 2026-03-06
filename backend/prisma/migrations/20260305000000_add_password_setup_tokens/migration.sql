CREATE TABLE IF NOT EXISTS "password_setup_tokens" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "token" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'ADMIN_PASSWORD_SETUP',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_setup_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_setup_tokens_token_key"
  ON "password_setup_tokens"("token");

CREATE INDEX IF NOT EXISTS "password_setup_tokens_userId_purpose_idx"
  ON "password_setup_tokens"("userId", "purpose");

CREATE INDEX IF NOT EXISTS "password_setup_tokens_expiresAt_idx"
  ON "password_setup_tokens"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'password_setup_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "password_setup_tokens"
    ADD CONSTRAINT "password_setup_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
