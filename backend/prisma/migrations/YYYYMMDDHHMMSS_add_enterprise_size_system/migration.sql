-- ============================================
-- ENTERPRISE SIZE SYSTEM MIGRATION
-- Migrates from basic SizeChartTemplate to full regional size management
-- ============================================

-- 1. CREATE REGION TABLE
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");
CREATE INDEX "Region_code_isActive_idx" ON "Region"("code", "isActive");

-- 2. CREATE SIZE STANDARD TABLE
CREATE TABLE "SizeStandard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lengthUnit" TEXT NOT NULL DEFAULT 'in',
    "weightUnit" TEXT NOT NULL DEFAULT 'lb',
    "chartVersion" TEXT NOT NULL DEFAULT '1.0',
    "chartUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeStandard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SizeStandard_code_key" ON "SizeStandard"("code");
CREATE UNIQUE INDEX "SizeStandard_regionId_category_key" ON "SizeStandard"("regionId", "category");
CREATE INDEX "SizeStandard_code_category_idx" ON "SizeStandard"("code", "category");

-- 3. CREATE REGIONAL SIZE TABLE
CREATE TABLE "RegionalSize" (
    "id" TEXT NOT NULL,
    "universalCode" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "displaySize" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "measurements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionalSize_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegionalSize_universalCode_key" ON "RegionalSize"("universalCode");
CREATE UNIQUE INDEX "RegionalSize_standardId_displaySize_key" ON "RegionalSize"("standardId", "displaySize");
CREATE INDEX "RegionalSize_universalCode_regionId_idx" ON "RegionalSize"("universalCode", "regionId");
CREATE INDEX "RegionalSize_standardId_sortOrder_idx" ON "RegionalSize"("standardId", "sortOrder");

-- 4. CREATE SIZE CONVERSION TABLE
CREATE TABLE "SizeConversion" (
    "id" TEXT NOT NULL,
    "fromStandardId" TEXT NOT NULL,
    "fromSize" TEXT NOT NULL,
    "toStandardId" TEXT NOT NULL,
    "toSize" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeConversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SizeConversion_fromStandardId_fromSize_toStandardId_key" ON "SizeConversion"("fromStandardId", "fromSize", "toStandardId");
CREATE INDEX "SizeConversion_fromStandardId_toStandardId_idx" ON "SizeConversion"("fromStandardId", "toStandardId");

-- 5. CREATE PRODUCT SIZE TABLE
CREATE TABLE "ProductSize" (
    "id" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "regionalSizeId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT NOT NULL,
    "priceModifier" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSize_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductSize_sku_key" ON "ProductSize"("sku");
CREATE UNIQUE INDEX "ProductSize_productId_regionalSizeId_key" ON "ProductSize"("productId", "regionalSizeId");
CREATE INDEX "ProductSize_productId_isAvailable_idx" ON "ProductSize"("productId", "isAvailable");
CREATE INDEX "ProductSize_regionalSizeId_stock_idx" ON "ProductSize"("regionalSizeId", "stock");

-- 6. ADD FOREIGN KEY CONSTRAINTS
ALTER TABLE "SizeStandard" ADD CONSTRAINT "SizeStandard_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RegionalSize" ADD CONSTRAINT "RegionalSize_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegionalSize" ADD CONSTRAINT "RegionalSize_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "SizeStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SizeConversion" ADD CONSTRAINT "SizeConversion_fromStandardId_fkey" FOREIGN KEY ("fromStandardId") REFERENCES "SizeStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SizeConversion" ADD CONSTRAINT "SizeConversion_toStandardId_fkey" FOREIGN KEY ("toStandardId") REFERENCES "SizeStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductSize" ADD CONSTRAINT "ProductSize_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductSize" ADD CONSTRAINT "ProductSize_regionalSizeId_fkey" FOREIGN KEY ("regionalSizeId") REFERENCES "RegionalSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. SEED INITIAL DATA

-- 7.1 Insert Regions
INSERT INTO "Region" ("id", "code", "name", "currency", "isActive", "priority") VALUES
('clreg_us', 'US', 'United States', 'USD', true, 1),
('clreg_uk', 'UK', 'United Kingdom', 'GBP', true, 2),
('clreg_eu', 'EU', 'European Union', 'EUR', true, 3),
('clreg_fr', 'FR', 'France', 'EUR', true, 4),
('clreg_au', 'AU', 'Australia', 'AUD', true, 5),
('clreg_jp', 'JP', 'Japan', 'JPY', true, 6),
('clreg_vn', 'VN', 'Vietnam', 'VND', true, 0);

-- 7.2 Insert Size Standards for Bras
INSERT INTO "SizeStandard" ("id", "code", "regionId", "category", "name", "lengthUnit", "chartVersion") VALUES
('clstd_us_bra', 'US_BRA', 'clreg_us', 'BRA', 'US Bra Size Standard', 'in', '1.0'),
('clstd_uk_bra', 'UK_BRA', 'clreg_uk', 'BRA', 'UK Bra Size Standard', 'in', '1.0'),
('clstd_eu_bra', 'EU_BRA', 'clreg_eu', 'BRA', 'EU Bra Size Standard', 'cm', '1.0'),
('clstd_fr_bra', 'FR_BRA', 'clreg_fr', 'BRA', 'French Bra Size Standard', 'cm', '1.0'),
('clstd_au_bra', 'AU_BRA', 'clreg_au', 'BRA', 'Australian Bra Size Standard', 'cm', '1.0'),
('clstd_jp_bra', 'JP_BRA', 'clreg_jp', 'BRA', 'Japanese Bra Size Standard', 'cm', '1.0');

-- 7.3 Insert Size Standards for Panties
INSERT INTO "SizeStandard" ("id", "code", "regionId", "category", "name", "lengthUnit", "chartVersion") VALUES
('clstd_us_panty', 'US_PANTY', 'clreg_us', 'PANTY', 'US Panty Size Standard', 'in', '1.0'),
('clstd_uk_panty', 'UK_PANTY', 'clreg_uk', 'PANTY', 'UK Panty Size Standard', 'in', '1.0'),
('clstd_eu_panty', 'EU_PANTY', 'clreg_eu', 'PANTY', 'EU Panty Size Standard', 'cm', '1.0'),
('clstd_fr_panty', 'FR_PANTY', 'clreg_fr', 'PANTY', 'French Panty Size Standard', 'cm', '1.0'),
('clstd_au_panty', 'AU_PANTY', 'clreg_au', 'PANTY', 'Australian Panty Size Standard', 'cm', '1.0'),
('clstd_jp_panty', 'JP_PANTY', 'clreg_jp', 'PANTY', 'Japanese Panty Size Standard', 'cm', '1.0');

-- 7.4 Sample US Bra Sizes (32A to 38DD)
-- Note: This is a simplified example. Full production data should include all sizes 28-44 and cups AA-N

-- 32 Band
INSERT INTO "RegionalSize" ("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder", "measurements") VALUES
('clsize_us_32a', 'UIC_BRA_32A', 'clreg_us', 'clstd_us_bra', '32A', 100, '{"bandSize": {"value": 32, "unit": "in", "min": 30, "max": 32}, "cupSize": {"value": "A", "letterCode": "A", "volume": 1}, "underBust": {"min": 28, "max": 30, "unit": "in"}, "bust": {"min": 33, "max": 34, "unit": "in"}}'),
('clsize_us_32b', 'UIC_BRA_32B', 'clreg_us', 'clstd_us_bra', '32B', 101, '{"bandSize": {"value": 32, "unit": "in", "min": 30, "max": 32}, "cupSize": {"value": "B", "letterCode": "B", "volume": 2}, "underBust": {"min": 28, "max": 30, "unit": "in"}, "bust": {"min": 34, "max": 35, "unit": "in"}}'),
('clsize_us_32c', 'UIC_BRA_32C', 'clreg_us', 'clstd_us_bra', '32C', 102, '{"bandSize": {"value": 32, "unit": "in", "min": 30, "max": 32}, "cupSize": {"value": "C", "letterCode": "C", "volume": 3}, "underBust": {"min": 28, "max": 30, "unit": "in"}, "bust": {"min": 35, "max": 36, "unit": "in"}}'),
('clsize_us_32d', 'UIC_BRA_32D', 'clreg_us', 'clstd_us_bra', '32D', 103, '{"bandSize": {"value": 32, "unit": "in", "min": 30, "max": 32}, "cupSize": {"value": "D", "letterCode": "D", "volume": 4}, "underBust": {"min": 28, "max": 30, "unit": "in"}, "bust": {"min": 36, "max": 37, "unit": "in"}}'),
('clsize_us_32dd', 'UIC_BRA_32DD', 'clreg_us', 'clstd_us_bra', '32DD', 104, '{"bandSize": {"value": 32, "unit": "in", "min": 30, "max": 32}, "cupSize": {"value": "DD", "letterCode": "DD", "volume": 5}, "underBust": {"min": 28, "max": 30, "unit": "in"}, "bust": {"min": 37, "max": 38, "unit": "in"}}');

-- 34 Band (most common size)
INSERT INTO "RegionalSize" ("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder", "measurements") VALUES
('clsize_us_34a', 'UIC_BRA_34A', 'clreg_us', 'clstd_us_bra', '34A', 200, '{"bandSize": {"value": 34, "unit": "in", "min": 32, "max": 34}, "cupSize": {"value": "A", "letterCode": "A", "volume": 1}, "underBust": {"min": 30, "max": 32, "unit": "in"}, "bust": {"min": 35, "max": 36, "unit": "in"}}'),
('clsize_us_34b', 'UIC_BRA_34B', 'clreg_us', 'clstd_us_bra', '34B', 201, '{"bandSize": {"value": 34, "unit": "in", "min": 32, "max": 34}, "cupSize": {"value": "B", "letterCode": "B", "volume": 2}, "underBust": {"min": 30, "max": 32, "unit": "in"}, "bust": {"min": 36, "max": 37, "unit": "in"}}'),
('clsize_us_34c', 'UIC_BRA_34C', 'clreg_us', 'clstd_us_bra', '34C', 202, '{"bandSize": {"value": 34, "unit": "in", "min": 32, "max": 34}, "cupSize": {"value": "C", "letterCode": "C", "volume": 3}, "underBust": {"min": 30, "max": 32, "unit": "in"}, "bust": {"min": 37, "max": 38, "unit": "in"}}'),
('clsize_us_34d', 'UIC_BRA_34D', 'clreg_us', 'clstd_us_bra', '34D', 203, '{"bandSize": {"value": 34, "unit": "in", "min": 32, "max": 34}, "cupSize": {"value": "D", "letterCode": "D", "volume": 4}, "underBust": {"min": 30, "max": 32, "unit": "in"}, "bust": {"min": 38, "max": 39, "unit": "in"}}'),
('clsize_us_34dd', 'UIC_BRA_34DD', 'clreg_us', 'clstd_us_bra', '34DD', 204, '{"bandSize": {"value": 34, "unit": "in", "min": 32, "max": 34}, "cupSize": {"value": "DD", "letterCode": "DD", "volume": 5}, "underBust": {"min": 30, "max": 32, "unit": "in"}, "bust": {"min": 39, "max": 40, "unit": "in"}}');

-- 36 Band
INSERT INTO "RegionalSize" ("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder", "measurements") VALUES
('clsize_us_36a', 'UIC_BRA_36A', 'clreg_us', 'clstd_us_bra', '36A', 300, '{"bandSize": {"value": 36, "unit": "in", "min": 34, "max": 36}, "cupSize": {"value": "A", "letterCode": "A", "volume": 1}, "underBust": {"min": 32, "max": 34, "unit": "in"}, "bust": {"min": 37, "max": 38, "unit": "in"}}'),
('clsize_us_36b', 'UIC_BRA_36B', 'clreg_us', 'clstd_us_bra', '36B', 301, '{"bandSize": {"value": 36, "unit": "in", "min": 34, "max": 36}, "cupSize": {"value": "B", "letterCode": "B", "volume": 2}, "underBust": {"min": 32, "max": 34, "unit": "in"}, "bust": {"min": 38, "max": 39, "unit": "in"}}'),
('clsize_us_36c', 'UIC_BRA_36C', 'clreg_us', 'clstd_us_bra', '36C', 302, '{"bandSize": {"value": 36, "unit": "in", "min": 34, "max": 36}, "cupSize": {"value": "C", "letterCode": "C", "volume": 3}, "underBust": {"min": 32, "max": 34, "unit": "in"}, "bust": {"min": 39, "max": 40, "unit": "in"}}'),
('clsize_us_36d', 'UIC_BRA_36D', 'clreg_us', 'clstd_us_bra', '36D', 303, '{"bandSize": {"value": 36, "unit": "in", "min": 34, "max": 36}, "cupSize": {"value": "D", "letterCode": "D", "volume": 4}, "underBust": {"min": 32, "max": 34, "unit": "in"}, "bust": {"min": 40, "max": 41, "unit": "in"}}'),
('clsize_us_36dd', 'UIC_BRA_36DD', 'clreg_us', 'clstd_us_bra', '36DD', 304, '{"bandSize": {"value": 36, "unit": "in", "min": 34, "max": 36}, "cupSize": {"value": "DD", "letterCode": "DD", "volume": 5}, "underBust": {"min": 32, "max": 34, "unit": "in"}, "bust": {"min": 41, "max": 42, "unit": "in"}}');

-- 7.5 Sample EU Bra Sizes (Conversions of above)
INSERT INTO "RegionalSize" ("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder", "measurements") VALUES
('clsize_eu_70a', 'UIC_BRA_32A', 'clreg_eu', 'clstd_eu_bra', '70A', 100, '{"bandSize": {"value": 70, "unit": "cm", "min": 68, "max": 72}, "cupSize": {"value": "A", "letterCode": "A", "volume": 1}, "underBust": {"min": 63, "max": 67, "unit": "cm"}, "bust": {"min": 77, "max": 79, "unit": "cm"}}'),
('clsize_eu_70b', 'UIC_BRA_32B', 'clreg_eu', 'clstd_eu_bra', '70B', 101, '{"bandSize": {"value": 70, "unit": "cm", "min": 68, "max": 72}, "cupSize": {"value": "B", "letterCode": "B", "volume": 2}, "underBust": {"min": 63, "max": 67, "unit": "cm"}, "bust": {"min": 79, "max": 81, "unit": "cm"}}'),
('clsize_eu_70c', 'UIC_BRA_32C', 'clreg_eu', 'clstd_eu_bra', '70C', 102, '{"bandSize": {"value": 70, "unit": "cm", "min": 68, "max": 72}, "cupSize": {"value": "C", "letterCode": "C", "volume": 3}, "underBust": {"min": 63, "max": 67, "unit": "cm"}, "bust": {"min": 81, "max": 83, "unit": "cm"}}'),
('clsize_eu_70d', 'UIC_BRA_32D', 'clreg_eu', 'clstd_eu_bra', '70D', 103, '{"bandSize": {"value": 70, "unit": "cm", "min": 68, "max": 72}, "cupSize": {"value": "D", "letterCode": "D", "volume": 4}, "underBust": {"min": 63, "max": 67, "unit": "cm"}, "bust": {"min": 83, "max": 85, "unit": "cm"}}'),
('clsize_eu_70e', 'UIC_BRA_32DD', 'clreg_eu', 'clstd_eu_bra', '70E', 104, '{"bandSize": {"value": 70, "unit": "cm", "min": 68, "max": 72}, "cupSize": {"value": "E", "letterCode": "E", "volume": 5}, "underBust": {"min": 63, "max": 67, "unit": "cm"}, "bust": {"min": 85, "max": 87, "unit": "cm"}}');

INSERT INTO "RegionalSize" ("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder", "measurements") VALUES
('clsize_eu_75a', 'UIC_BRA_34A', 'clreg_eu', 'clstd_eu_bra', '75A', 200, '{"bandSize": {"value": 75, "unit": "cm", "min": 73, "max": 77}, "cupSize": {"value": "A", "letterCode": "A", "volume": 1}, "underBust": {"min": 68, "max": 72, "unit": "cm"}, "bust": {"min": 82, "max": 84, "unit": "cm"}}'),
('clsize_eu_75b', 'UIC_BRA_34B', 'clreg_eu', 'clstd_eu_bra', '75B', 201, '{"bandSize": {"value": 75, "unit": "cm", "min": 73, "max": 77}, "cupSize": {"value": "B", "letterCode": "B", "volume": 2}, "underBust": {"min": 68, "max": 72, "unit": "cm"}, "bust": {"min": 84, "max": 86, "unit": "cm"}}'),
('clsize_eu_75c', 'UIC_BRA_34C', 'clreg_eu', 'clstd_eu_bra', '75C', 202, '{"bandSize": {"value": 75, "unit": "cm", "min": 73, "max": 77}, "cupSize": {"value": "C", "letterCode": "C", "volume": 3}, "underBust": {"min": 68, "max": 72, "unit": "cm"}, "bust": {"min": 86, "max": 88, "unit": "cm"}}'),
('clsize_eu_75d', 'UIC_BRA_34D', 'clreg_eu', 'clstd_eu_bra', '75D', 203, '{"bandSize": {"value": 75, "unit": "cm", "min": 73, "max": 77}, "cupSize": {"value": "D", "letterCode": "D", "volume": 4}, "underBust": {"min": 68, "max": 72, "unit": "cm"}, "bust": {"min": 88, "max": 90, "unit": "cm"}}'),
('clsize_eu_75e', 'UIC_BRA_34DD', 'clreg_eu', 'clstd_eu_bra', '75E', 204, '{"bandSize": {"value": 75, "unit": "cm", "min": 73, "max": 77}, "cupSize": {"value": "E", "letterCode": "E", "volume": 5}, "underBust": {"min": 68, "max": 72, "unit": "cm"}, "bust": {"min": 90, "max": 92, "unit": "cm"}}');

-- 7.6 Sample Size Conversions
INSERT INTO "SizeConversion" ("id", "fromStandardId", "fromSize", "toStandardId", "toSize", "confidence") VALUES
-- 32 Band conversions
('clconv_32a_us_eu', 'clstd_us_bra', '32A', 'clstd_eu_bra', '70A', 1.0),
('clconv_32b_us_eu', 'clstd_us_bra', '32B', 'clstd_eu_bra', '70B', 1.0),
('clconv_32c_us_eu', 'clstd_us_bra', '32C', 'clstd_eu_bra', '70C', 1.0),
('clconv_32d_us_eu', 'clstd_us_bra', '32D', 'clstd_eu_bra', '70D', 1.0),
('clconv_32dd_us_eu', 'clstd_us_bra', '32DD', 'clstd_eu_bra', '70E', 1.0),

-- 34 Band conversions
('clconv_34a_us_eu', 'clstd_us_bra', '34A', 'clstd_eu_bra', '75A', 1.0),
('clconv_34b_us_eu', 'clstd_us_bra', '34B', 'clstd_eu_bra', '75B', 1.0),
('clconv_34c_us_eu', 'clstd_us_bra', '34C', 'clstd_eu_bra', '75C', 1.0),
('clconv_34d_us_eu', 'clstd_us_bra', '34D', 'clstd_eu_bra', '75D', 1.0),
('clconv_34dd_us_eu', 'clstd_us_bra', '34DD', 'clstd_eu_bra', '75E', 1.0),

-- Reverse conversions (EU -> US)
('clconv_70a_eu_us', 'clstd_eu_bra', '70A', 'clstd_us_bra', '32A', 1.0),
('clconv_70b_eu_us', 'clstd_eu_bra', '70B', 'clstd_us_bra', '32B', 1.0),
('clconv_70c_eu_us', 'clstd_eu_bra', '70C', 'clstd_us_bra', '32C', 1.0),
('clconv_70d_eu_us', 'clstd_eu_bra', '70D', 'clstd_us_bra', '32D', 1.0),
('clconv_70e_eu_us', 'clstd_eu_bra', '70E', 'clstd_us_bra', '32DD', 1.0),

('clconv_75a_eu_us', 'clstd_eu_bra', '75A', 'clstd_us_bra', '34A', 1.0),
('clconv_75b_eu_us', 'clstd_eu_bra', '75B', 'clstd_us_bra', '34B', 1.0),
('clconv_75c_eu_us', 'clstd_eu_bra', '75C', 'clstd_us_bra', '34C', 1.0),
('clconv_75d_eu_us', 'clstd_eu_bra', '75D', 'clstd_us_bra', '34D', 1.0),
('clconv_75e_eu_us', 'clstd_eu_bra', '75E', 'clstd_us_bra', '34DD', 1.0);

-- 7.7 Sample US Panty Sizes
INSERT INTO "RegionalSize" ("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder", "measurements") VALUES
('clsize_us_panty_xs', 'UIC_PANTY_XS', 'clreg_us', 'clstd_us_panty', 'XS', 100, '{"size": {"value": "XS"}, "waist": {"min": 23, "max": 25, "unit": "in"}, "hip": {"min": 33, "max": 35, "unit": "in"}}'),
('clsize_us_panty_s', 'UIC_PANTY_S', 'clreg_us', 'clstd_us_panty', 'S', 200, '{"size": {"value": "S"}, "waist": {"min": 25, "max": 27, "unit": "in"}, "hip": {"min": 35, "max": 37, "unit": "in"}}'),
('clsize_us_panty_m', 'UIC_PANTY_M', 'clreg_us', 'clstd_us_panty', 'M', 300, '{"size": {"value": "M"}, "waist": {"min": 27, "max": 29, "unit": "in"}, "hip": {"min": 37, "max": 39, "unit": "in"}}'),
('clsize_us_panty_l', 'UIC_PANTY_L', 'clreg_us', 'clstd_us_panty', 'L', 400, '{"size": {"value": "L"}, "waist": {"min": 29, "max": 31, "unit": "in"}, "hip": {"min": 39, "max": 41, "unit": "in"}}'),
('clsize_us_panty_xl', 'UIC_PANTY_XL', 'clreg_us', 'clstd_us_panty', 'XL', 500, '{"size": {"value": "XL"}, "waist": {"min": 31, "max": 33, "unit": "in"}, "hip": {"min": 41, "max": 43, "unit": "in"}}');

-- 7.8 Sample EU Panty Sizes (numeric sizing)
INSERT INTO "RegionalSize" ("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder", "measurements") VALUES
('clsize_eu_panty_34', 'UIC_PANTY_XS', 'clreg_eu', 'clstd_eu_panty', '34', 100, '{"size": {"value": "34", "numeric": 34}, "waist": {"min": 58, "max": 62, "unit": "cm"}, "hip": {"min": 84, "max": 88, "unit": "cm"}}'),
('clsize_eu_panty_36', 'UIC_PANTY_S', 'clreg_eu', 'clstd_eu_panty', '36', 200, '{"size": {"value": "36", "numeric": 36}, "waist": {"min": 62, "max": 66, "unit": "cm"}, "hip": {"min": 88, "max": 92, "unit": "cm"}}'),
('clsize_eu_panty_38', 'UIC_PANTY_M', 'clreg_eu', 'clstd_eu_panty', '38', 300, '{"size": {"value": "38", "numeric": 38}, "waist": {"min": 66, "max": 70, "unit": "cm"}, "hip": {"min": 92, "max": 96, "unit": "cm"}}'),
('clsize_eu_panty_40', 'UIC_PANTY_L', 'clreg_eu', 'clstd_eu_panty', '40', 400, '{"size": {"value": "40", "numeric": 40}, "waist": {"min": 70, "max": 74, "unit": "cm"}, "hip": {"min": 96, "max": 100, "unit": "cm"}}'),
('clsize_eu_panty_42', 'UIC_PANTY_XL', 'clreg_eu', 'clstd_eu_panty', '42', 500, '{"size": {"value": "42", "numeric": 42}, "waist": {"min": 74, "max": 78, "unit": "cm"}, "hip": {"min": 100, "max": 104, "unit": "cm"}}');

-- 7.9 Panty Size Conversions
INSERT INTO "SizeConversion" ("id", "fromStandardId", "fromSize", "toStandardId", "toSize", "confidence") VALUES
('clconv_panty_xs_us_eu', 'clstd_us_panty', 'XS', 'clstd_eu_panty', '34', 1.0),
('clconv_panty_s_us_eu', 'clstd_us_panty', 'S', 'clstd_eu_panty', '36', 1.0),
('clconv_panty_m_us_eu', 'clstd_us_panty', 'M', 'clstd_eu_panty', '38', 1.0),
('clconv_panty_l_us_eu', 'clstd_us_panty', 'L', 'clstd_eu_panty', '40', 1.0),
('clconv_panty_xl_us_eu', 'clstd_us_panty', 'XL', 'clstd_eu_panty', '42', 1.0),

-- Reverse
('clconv_panty_34_eu_us', 'clstd_eu_panty', '34', 'clstd_us_panty', 'XS', 1.0),
('clconv_panty_36_eu_us', 'clstd_eu_panty', '36', 'clstd_us_panty', 'S', 1.0),
('clconv_panty_38_eu_us', 'clstd_eu_panty', '38', 'clstd_us_panty', 'M', 1.0),
('clconv_panty_40_eu_us', 'clstd_eu_panty', '40', 'clstd_us_panty', 'L', 1.0),
('clconv_panty_42_eu_us', 'clstd_eu_panty', '42', 'clstd_us_panty', 'XL', 1.0);

-- 8. UPDATE UserPreference table to store region preference
ALTER TABLE "UserPreference" ADD COLUMN "preferredRegion" TEXT DEFAULT 'US';
ALTER TABLE "UserPreference" ADD COLUMN "preferredLengthUnit" TEXT DEFAULT 'in';
ALTER TABLE "UserPreference" ADD COLUMN "preferredWeightUnit" TEXT DEFAULT 'lb';

-- 9. CREATE ADMIN AUDIT LOG for size changes
CREATE TABLE "SizeSystemAuditLog" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SizeSystemAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SizeSystemAuditLog_userId_idx" ON "SizeSystemAuditLog"("userId");
CREATE INDEX "SizeSystemAuditLog_action_idx" ON "SizeSystemAuditLog"("action");
CREATE INDEX "SizeSystemAuditLog_entityType_idx" ON "SizeSystemAuditLog"("entityType");
CREATE INDEX "SizeSystemAuditLog_createdAt_idx" ON "SizeSystemAuditLog"("createdAt");

-- 10. PERFORMANCE: Partial index for available stock
CREATE INDEX "ProductSize_available_stock_idx" ON "ProductSize"("regionalSizeId")
WHERE "isAvailable" = true AND "stock" > 0;

-- Migration complete!
