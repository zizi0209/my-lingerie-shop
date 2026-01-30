-- Add missing columns to Product and ProductVariant tables
-- These were added to schema.prisma but not included in migration

-- Add brandId to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brandId" TEXT;

-- Add baseSize and baseSizeUIC to ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "baseSize" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "baseSizeUIC" TEXT;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Product_brandId_fkey'
  ) THEN
    ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey"
      FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductVariant_baseSizeUIC_fkey'
  ) THEN
    ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_baseSizeUIC_fkey"
      FOREIGN KEY ("baseSizeUIC") REFERENCES "regional_sizes"("universalCode") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX IF NOT EXISTS "ProductVariant_baseSizeUIC_idx" ON "ProductVariant"("baseSizeUIC");
