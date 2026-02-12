-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "model3dUrl" TEXT,
ADD COLUMN     "noBgUrl" TEXT,
ADD COLUMN     "processingStatus" TEXT NOT NULL DEFAULT 'pending';




