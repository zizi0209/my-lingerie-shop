-- Rename color to colorName in ProductVariant
ALTER TABLE "ProductVariant" RENAME COLUMN "color" TO "colorName";

-- Drop old index if exists
DROP INDEX IF EXISTS "ProductVariant_color_idx";

-- Create new index
CREATE INDEX IF NOT EXISTS "ProductVariant_colorName_idx" ON "ProductVariant"("colorName");

-- Drop old unique constraint if exists
ALTER TABLE "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_productId_size_color_key";

-- Create new unique constraint  
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_size_colorName_key" UNIQUE ("productId", "size", "colorName");
