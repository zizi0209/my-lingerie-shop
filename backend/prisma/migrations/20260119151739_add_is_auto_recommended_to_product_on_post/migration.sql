-- AlterTable
ALTER TABLE "ProductOnPost" ADD COLUMN     "isAutoRecommended" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ProductOnPost_isAutoRecommended_idx" ON "ProductOnPost"("isAutoRecommended");
