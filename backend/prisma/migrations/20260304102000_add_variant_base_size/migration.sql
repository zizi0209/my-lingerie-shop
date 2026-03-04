-- Add base size fields for ProductVariant (Size System V2)
ALTER TABLE "ProductVariant"
  ADD COLUMN "baseSize" TEXT,
  ADD COLUMN "baseSizeUIC" TEXT;

CREATE INDEX "ProductVariant_baseSizeUIC_idx" ON "ProductVariant"("baseSizeUIC");

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_baseSizeUIC_fkey"
  FOREIGN KEY ("baseSizeUIC") REFERENCES "regional_sizes"("universalCode")
  ON DELETE RESTRICT ON UPDATE CASCADE;
