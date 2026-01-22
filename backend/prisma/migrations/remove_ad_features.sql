-- Migration: Remove Ad Features (isAd, adEnabled, adDelaySeconds)
-- Date: 2026-01-21
-- Description: Xóa các field liên quan đến popup quảng cáo vì không còn sử dụng

-- Remove isAd from ProductOnPost
ALTER TABLE "ProductOnPost" DROP COLUMN IF EXISTS "isAd";

-- Remove adEnabled and adDelaySeconds from Post
ALTER TABLE "Post" DROP COLUMN IF EXISTS "adEnabled";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "adDelaySeconds";
