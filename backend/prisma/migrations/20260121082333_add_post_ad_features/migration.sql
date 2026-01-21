-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "adDelaySeconds" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "adEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductOnPost" ADD COLUMN     "isAd" BOOLEAN NOT NULL DEFAULT false;
