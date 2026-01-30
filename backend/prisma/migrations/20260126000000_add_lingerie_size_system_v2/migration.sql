-- ============================================
-- LINGERIE SIZE SYSTEM V2 - MIGRATION
-- Migration file: add_lingerie_size_system_v2
-- ============================================

-- Drop old tables if migrating from v1
-- (Skip this if fresh install)
-- DROP TABLE IF EXISTS "ProductSize" CASCADE;

-- ============================================
-- 1. CREATE REGION TABLE
-- ============================================

CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");
CREATE INDEX "regions_code_isActive_idx" ON "regions"("code", "isActive");

-- ============================================
-- 2. CREATE SIZE STANDARD TABLE
-- ============================================

CREATE TABLE "size_standards" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lengthUnit" TEXT NOT NULL DEFAULT 'in',
    "weightUnit" TEXT NOT NULL DEFAULT 'lb',
    "cupProgression" JSONB NOT NULL,
    "chartVersion" TEXT NOT NULL DEFAULT '1.0',
    "chartUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "size_standards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "size_standards_code_key" ON "size_standards"("code");
CREATE UNIQUE INDEX "size_standards_regionId_category_key" ON "size_standards"("regionId", "category");
CREATE INDEX "size_standards_code_category_idx" ON "size_standards"("code", "category");

-- ============================================
-- 3. CREATE REGIONAL SIZE TABLE (WITH SISTER SIZING)
-- ============================================

CREATE TABLE "regional_sizes" (
    "id" TEXT NOT NULL,
    "universalCode" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "displaySize" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "bandSize" INTEGER NOT NULL,
    "cupVolume" INTEGER NOT NULL,
    "cupLetter" TEXT NOT NULL,
    "measurements" JSONB NOT NULL,
    "sisterSizeDownUIC" TEXT,
    "sisterSizeUpUIC" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regional_sizes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "regional_sizes_universalCode_key" ON "regional_sizes"("universalCode");
CREATE UNIQUE INDEX "regional_sizes_standardId_displaySize_key" ON "regional_sizes"("standardId", "displaySize");
CREATE INDEX "regional_sizes_universalCode_regionId_idx" ON "regional_sizes"("universalCode", "regionId");
CREATE INDEX "regional_sizes_bandSize_cupVolume_idx" ON "regional_sizes"("bandSize", "cupVolume");
CREATE INDEX "regional_sizes_standardId_sortOrder_idx" ON "regional_sizes"("standardId", "sortOrder");

-- ============================================
-- 4. CREATE SIZE CONVERSION TABLE
-- ============================================

CREATE TABLE "size_conversions" (
    "id" TEXT NOT NULL,
    "fromStandardId" TEXT NOT NULL,
    "fromSize" TEXT NOT NULL,
    "fromBand" INTEGER NOT NULL,
    "fromCupLetter" TEXT NOT NULL,
    "fromCupVolume" INTEGER NOT NULL,
    "toStandardId" TEXT NOT NULL,
    "toSize" TEXT NOT NULL,
    "toBand" INTEGER NOT NULL,
    "toCupLetter" TEXT NOT NULL,
    "toCupVolume" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "size_conversions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "size_conversions_unique" ON "size_conversions"("fromStandardId", "fromSize", "toStandardId");
CREATE INDEX "size_conversions_standards_idx" ON "size_conversions"("fromStandardId", "toStandardId");
CREATE INDEX "size_conversions_volumes_idx" ON "size_conversions"("fromCupVolume", "toCupVolume");

-- ============================================
-- 5. CREATE BRAND TABLE
-- ============================================

CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "fitType" TEXT NOT NULL DEFAULT 'TRUE_TO_SIZE',
    "bandAdjustment" INTEGER NOT NULL DEFAULT 0,
    "cupAdjustment" INTEGER NOT NULL DEFAULT 0,
    "fitNotes" TEXT,
    "fitConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");
CREATE INDEX "brands_slug_idx" ON "brands"("slug");
CREATE INDEX "brands_fitType_idx" ON "brands"("fitType");

-- ============================================
-- 6. CREATE SISTER SIZE RECOMMENDATION LOG
-- ============================================

CREATE TABLE "sister_size_recommendations" (
    "id" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "requestedSize" TEXT NOT NULL,
    "requestedUIC" TEXT NOT NULL,
    "recommendedSize" TEXT NOT NULL,
    "recommendedUIC" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "accepted" BOOLEAN,
    "acceptedAt" TIMESTAMP(3),
    "userId" INTEGER,
    "sessionId" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sister_size_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sister_size_recommendations_product_idx" ON "sister_size_recommendations"("productId", "requestedSize");
CREATE INDEX "sister_size_recommendations_accepted_idx" ON "sister_size_recommendations"("accepted");
CREATE INDEX "sister_size_recommendations_created_idx" ON "sister_size_recommendations"("createdAt");
CREATE INDEX "sister_size_recommendations_session_idx" ON "sister_size_recommendations"("sessionId");

-- ============================================
-- 7. CREATE BRAND FIT FEEDBACK
-- ============================================

CREATE TABLE "brand_fit_feedback" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "userId" INTEGER,
    "normalSize" TEXT NOT NULL,
    "boughtSize" TEXT NOT NULL,
    "fitRating" INTEGER NOT NULL,
    "fitComment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_fit_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "brand_fit_feedback_brand_idx" ON "brand_fit_feedback"("brandId");
CREATE INDEX "brand_fit_feedback_rating_idx" ON "brand_fit_feedback"("fitRating");
CREATE INDEX "brand_fit_feedback_verified_idx" ON "brand_fit_feedback"("isVerified");

-- ============================================
-- 8. CREATE CUP PROGRESSION MAP
-- ============================================

CREATE TABLE "cup_progression_maps" (
    "id" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "cupVolume" INTEGER NOT NULL,
    "cupLetter" TEXT NOT NULL,
    "isStandard" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cup_progression_maps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cup_progression_maps_unique" ON "cup_progression_maps"("regionCode", "cupVolume");
CREATE INDEX "cup_progression_maps_region_letter_idx" ON "cup_progression_maps"("regionCode", "cupLetter");

-- ============================================
-- 9. CREATE SIZE SYSTEM AUDIT LOG
-- ============================================

CREATE TABLE "size_system_audit_logs" (
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

    CONSTRAINT "size_system_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "size_system_audit_logs_user_idx" ON "size_system_audit_logs"("userId");
CREATE INDEX "size_system_audit_logs_action_idx" ON "size_system_audit_logs"("action");
CREATE INDEX "size_system_audit_logs_entity_idx" ON "size_system_audit_logs"("entityType");
CREATE INDEX "size_system_audit_logs_created_idx" ON "size_system_audit_logs"("createdAt");

-- ============================================
-- 10. ADD FOREIGN KEY CONSTRAINTS
-- ============================================

ALTER TABLE "size_standards" ADD CONSTRAINT "size_standards_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "regional_sizes" ADD CONSTRAINT "regional_sizes_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "regional_sizes" ADD CONSTRAINT "regional_sizes_standardId_fkey"
    FOREIGN KEY ("standardId") REFERENCES "size_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "size_conversions" ADD CONSTRAINT "size_conversions_fromStandardId_fkey"
    FOREIGN KEY ("fromStandardId") REFERENCES "size_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "size_conversions" ADD CONSTRAINT "size_conversions_toStandardId_fkey"
    FOREIGN KEY ("toStandardId") REFERENCES "size_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "brand_fit_feedback" ADD CONSTRAINT "brand_fit_feedback_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 11. ADD brandId TO EXISTING Product TABLE
-- ============================================

ALTER TABLE "Product" ADD COLUMN "brandId" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- ============================================
-- 12. UPDATE UserPreference TABLE
-- ============================================

ALTER TABLE "UserPreference" ADD COLUMN "preferredSizeStandard" TEXT DEFAULT 'US';
ALTER TABLE "UserPreference" ADD COLUMN "preferredLengthUnit" TEXT DEFAULT 'in';
ALTER TABLE "UserPreference" ADD COLUMN "preferredWeightUnit" TEXT DEFAULT 'lb';
ALTER TABLE "UserPreference" ADD COLUMN "shippingCountry" TEXT;
ALTER TABLE "UserPreference" ADD COLUMN "preferredCurrency" TEXT DEFAULT 'USD';
ALTER TABLE "UserPreference" ADD COLUMN "bodyMeasurements" JSONB;

-- ============================================
-- 13. SEED DATA - REGIONS
-- ============================================

INSERT INTO "regions" ("id", "code", "name", "currency", "isActive", "priority", "createdAt", "updatedAt") VALUES
('reg_us', 'US', 'United States', 'USD', true, 1, NOW(), NOW()),
('reg_uk', 'UK', 'United Kingdom', 'GBP', true, 2, NOW(), NOW()),
('reg_eu', 'EU', 'European Union', 'EUR', true, 3, NOW(), NOW()),
('reg_fr', 'FR', 'France', 'EUR', true, 4, NOW(), NOW()),
('reg_au', 'AU', 'Australia', 'AUD', true, 5, NOW(), NOW()),
('reg_jp', 'JP', 'Japan', 'JPY', true, 6, NOW(), NOW()),
('reg_vn', 'VN', 'Vietnam', 'VND', true, 0, NOW(), NOW());

-- ============================================
-- 14. SEED DATA - CUP PROGRESSION MAPS
-- ============================================

-- US Cup Progression
INSERT INTO "cup_progression_maps" ("id", "regionCode", "cupVolume", "cupLetter", "createdAt") VALUES
('cup_us_1', 'US', 1, 'A', NOW()),
('cup_us_2', 'US', 2, 'B', NOW()),
('cup_us_3', 'US', 3, 'C', NOW()),
('cup_us_4', 'US', 4, 'D', NOW()),
('cup_us_5', 'US', 5, 'DD', NOW()),
('cup_us_6', 'US', 6, 'DDD', NOW()),
('cup_us_7', 'US', 7, 'G', NOW()),
('cup_us_8', 'US', 8, 'H', NOW()),
('cup_us_9', 'US', 9, 'I', NOW()),
('cup_us_10', 'US', 10, 'J', NOW());

-- UK Cup Progression
INSERT INTO "cup_progression_maps" ("id", "regionCode", "cupVolume", "cupLetter", "createdAt") VALUES
('cup_uk_1', 'UK', 1, 'A', NOW()),
('cup_uk_2', 'UK', 2, 'B', NOW()),
('cup_uk_3', 'UK', 3, 'C', NOW()),
('cup_uk_4', 'UK', 4, 'D', NOW()),
('cup_uk_5', 'UK', 5, 'DD', NOW()),
('cup_uk_6', 'UK', 6, 'E', NOW()),
('cup_uk_7', 'UK', 7, 'F', NOW()),
('cup_uk_8', 'UK', 8, 'FF', NOW()),
('cup_uk_9', 'UK', 9, 'G', NOW()),
('cup_uk_10', 'UK', 10, 'GG', NOW());

-- EU Cup Progression
INSERT INTO "cup_progression_maps" ("id", "regionCode", "cupVolume", "cupLetter", "createdAt") VALUES
('cup_eu_1', 'EU', 1, 'A', NOW()),
('cup_eu_2', 'EU', 2, 'B', NOW()),
('cup_eu_3', 'EU', 3, 'C', NOW()),
('cup_eu_4', 'EU', 4, 'D', NOW()),
('cup_eu_5', 'EU', 5, 'E', NOW()),
('cup_eu_6', 'EU', 6, 'F', NOW()),
('cup_eu_7', 'EU', 7, 'G', NOW()),
('cup_eu_8', 'EU', 8, 'H', NOW()),
('cup_eu_9', 'EU', 9, 'I', NOW()),
('cup_eu_10', 'EU', 10, 'J', NOW());

-- ============================================
-- 15. SEED DATA - SIZE STANDARDS
-- ============================================

INSERT INTO "size_standards" ("id", "code", "regionId", "category", "name", "lengthUnit", "cupProgression", "createdAt", "updatedAt") VALUES
('std_us_bra', 'US_BRA', 'reg_us', 'BRA', 'US Bra Standard', 'in',
 '["A","B","C","D","DD","DDD","G","H","I","J"]'::jsonb, NOW(), NOW()),

('std_uk_bra', 'UK_BRA', 'reg_uk', 'BRA', 'UK Bra Standard', 'in',
 '["A","B","C","D","DD","E","F","FF","G","GG"]'::jsonb, NOW(), NOW()),

('std_eu_bra', 'EU_BRA', 'reg_eu', 'BRA', 'EU Bra Standard', 'cm',
 '["A","B","C","D","E","F","G","H","I","J"]'::jsonb, NOW(), NOW());

-- ============================================
-- 16. SEED DATA - SAMPLE REGIONAL SIZES (34 BAND US)
-- ============================================

-- US 34C (bandSize in cm: 34in = 86cm, cupVolume: 6)
INSERT INTO "regional_sizes"
("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder",
 "bandSize", "cupVolume", "cupLetter", "measurements", "createdAt", "updatedAt")
VALUES
('size_us_34c', 'UIC_BRA_BAND86_CUPVOL6', 'reg_us', 'std_us_bra', '34C', 200,
 86, 6, 'C',
 '{"bandSize":{"value":34,"unit":"in","min":32,"max":34},"cupSize":{"value":"C","letterCode":"C","volume":6},"underBust":{"min":30,"max":32,"unit":"in"},"bust":{"min":37,"max":38,"unit":"in"}}'::jsonb,
 NOW(), NOW());

-- EU 75C (bandSize: 75cm, cupVolume: 6 - SAME volume as US 34C!)
INSERT INTO "regional_sizes"
("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder",
 "bandSize", "cupVolume", "cupLetter", "measurements", "createdAt", "updatedAt")
VALUES
('size_eu_75c', 'UIC_BRA_BAND86_CUPVOL6', 'reg_eu', 'std_eu_bra', '75C', 200,
 86, 6, 'C',
 '{"bandSize":{"value":75,"unit":"cm","min":73,"max":77},"cupSize":{"value":"C","letterCode":"C","volume":6},"underBust":{"min":68,"max":72,"unit":"cm"},"bust":{"min":86,"max":88,"unit":"cm"}}'::jsonb,
 NOW(), NOW());

-- Sister Size Down: US 32D (bandSize: 81cm = 32in, cupVolume: 6 - SAME!)
INSERT INTO "regional_sizes"
("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder",
 "bandSize", "cupVolume", "cupLetter", "measurements",
 "sisterSizeUpUIC", "createdAt", "updatedAt")
VALUES
('size_us_32d', 'UIC_BRA_BAND81_CUPVOL6', 'reg_us', 'std_us_bra', '32D', 103,
 81, 6, 'D',
 '{"bandSize":{"value":32,"unit":"in","min":30,"max":32},"cupSize":{"value":"D","letterCode":"D","volume":6},"underBust":{"min":28,"max":30,"unit":"in"},"bust":{"min":36,"max":37,"unit":"in"}}'::jsonb,
 'UIC_BRA_BAND86_CUPVOL6', -- Sister up is 34C
 NOW(), NOW());

-- Sister Size Up: US 36B (bandSize: 91cm = 36in, cupVolume: 6 - SAME!)
INSERT INTO "regional_sizes"
("id", "universalCode", "regionId", "standardId", "displaySize", "sortOrder",
 "bandSize", "cupVolume", "cupLetter", "measurements",
 "sisterSizeDownUIC", "createdAt", "updatedAt")
VALUES
('size_us_36b', 'UIC_BRA_BAND91_CUPVOL6', 'reg_us', 'std_us_bra', '36B', 301,
 91, 6, 'B',
 '{"bandSize":{"value":36,"unit":"in","min":34,"max":36},"cupSize":{"value":"B","letterCode":"B","volume":6},"underBust":{"min":32,"max":34,"unit":"in"},"bust":{"min":38,"max":39,"unit":"in"}}'::jsonb,
 'UIC_BRA_BAND86_CUPVOL6', -- Sister down is 34C
 NOW(), NOW());

-- Update 34C with sister size references
UPDATE "regional_sizes"
SET "sisterSizeDownUIC" = 'UIC_BRA_BAND81_CUPVOL6',
    "sisterSizeUpUIC" = 'UIC_BRA_BAND91_CUPVOL6'
WHERE "universalCode" = 'UIC_BRA_BAND86_CUPVOL6';

-- ============================================
-- 17. SEED DATA - SIZE CONVERSIONS
-- ============================================

INSERT INTO "size_conversions"
("id", "fromStandardId", "fromSize", "fromBand", "fromCupLetter", "fromCupVolume",
 "toStandardId", "toSize", "toBand", "toCupLetter", "toCupVolume",
 "confidence", "createdAt", "updatedAt")
VALUES
('conv_us34c_eu75c', 'std_us_bra', '34C', 86, 'C', 6,
 'std_eu_bra', '75C', 86, 'C', 6,
 1.0, NOW(), NOW()),

('conv_eu75c_us34c', 'std_eu_bra', '75C', 86, 'C', 6,
 'std_us_bra', '34C', 86, 'C', 6,
 1.0, NOW(), NOW());

-- ============================================
-- 18. SEED DATA - SAMPLE BRANDS
-- ============================================

INSERT INTO "brands"
("id", "name", "slug", "fitType", "bandAdjustment", "cupAdjustment",
 "fitNotes", "fitConfidence", "createdAt", "updatedAt")
VALUES
('brand_vs', 'Victoria''s Secret', 'victorias-secret', 'TRUE_TO_SIZE', 0, 0,
 'True to size. Most customers find their usual size fits perfectly.', 0.9, NOW(), NOW()),

('brand_ap', 'Agent Provocateur', 'agent-provocateur', 'RUNS_SMALL', 1, 1,
 'This brand runs small. We recommend sizing up one band and one cup size. For example, if you normally wear 34C, try 36D.', 0.85, NOW(), NOW()),

('brand_bb', 'Bluebella', 'bluebella', 'RUNS_LARGE', -1, 0,
 'This brand runs large in the band. We recommend sizing down one band size. For example, if you normally wear 34C, try 32C.', 0.8, NOW(), NOW());

-- ============================================
-- 19. CREATE HELPER FUNCTION FOR SISTER SIZES
-- ============================================

CREATE OR REPLACE FUNCTION get_sister_sizes(target_uic TEXT)
RETURNS TABLE(
    relationship TEXT,
    uic TEXT,
    display_size TEXT,
    band_size INT,
    cup_volume INT,
    region_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH target AS (
        SELECT "bandSize", "cupVolume", "regionId"
        FROM "regional_sizes"
        WHERE "universalCode" = target_uic
    )
    SELECT
        'ORIGINAL'::TEXT,
        rs."universalCode",
        rs."displaySize",
        rs."bandSize",
        rs."cupVolume",
        rs."regionId"
    FROM "regional_sizes" rs
    WHERE rs."universalCode" = target_uic

    UNION ALL

    -- Sister Down (band -5cm, same cup volume)
    SELECT
        'SISTER_DOWN'::TEXT,
        rs."universalCode",
        rs."displaySize",
        rs."bandSize",
        rs."cupVolume",
        rs."regionId"
    FROM "regional_sizes" rs, target t
    WHERE rs."bandSize" = t."bandSize" - 5
      AND rs."cupVolume" = t."cupVolume"
      AND rs."regionId" = t."regionId"

    UNION ALL

    -- Sister Up (band +5cm, same cup volume)
    SELECT
        'SISTER_UP'::TEXT,
        rs."universalCode",
        rs."displaySize",
        rs."bandSize",
        rs."cupVolume",
        rs."regionId"
    FROM "regional_sizes" rs, target t
    WHERE rs."bandSize" = t."bandSize" + 5
      AND rs."cupVolume" = t."cupVolume"
      AND rs."regionId" = t."regionId";
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_sister_sizes('UIC_BRA_BAND86_CUPVOL6');

-- ============================================
-- 20. PERFORMANCE INDEXES
-- ============================================

-- Partial index for available stock (if using ProductVariant)
CREATE INDEX "ProductVariant_available_stock_idx"
ON "ProductVariant"("stock")
WHERE "stock" > 0;

-- Composite index for sister size lookups
CREATE INDEX "regional_sizes_sister_lookup_idx"
ON "regional_sizes"("regionId", "bandSize", "cupVolume");

-- Migration complete!
