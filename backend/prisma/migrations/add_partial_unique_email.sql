-- Drop old unique constraint if exists
DROP INDEX IF EXISTS "User_email_key";

-- Create partial unique index (only for active users)
CREATE UNIQUE INDEX "users_email_unique_active" 
ON "User" (email) 
WHERE "deletedAt" IS NULL;

-- Add comment for documentation
COMMENT ON INDEX "users_email_unique_active" IS 'Partial unique index: ensures email uniqueness only for active (non-deleted) users. Allows same email for soft-deleted users to enable restore functionality.';
