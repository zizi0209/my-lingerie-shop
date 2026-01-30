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

