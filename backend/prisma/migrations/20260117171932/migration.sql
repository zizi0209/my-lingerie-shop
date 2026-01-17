/*
  Warnings:

  - You are about to drop the column `color` on the `ProductVariant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,size,colorName]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,size,colorName]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `colorName` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('BRA', 'PANTY', 'SET', 'SLEEPWEAR', 'SHAPEWEAR', 'ACCESSORY');

-- DropIndex
DROP INDEX "ProductVariant_productId_size_color_key";

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "discountCouponCode" TEXT,
ADD COLUMN     "discountCouponId" INTEGER,
ADD COLUMN     "lastAbandonedAt" TIMESTAMP(3),
ADD COLUMN     "recoveredCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingCouponCode" TEXT,
ADD COLUMN     "shippingCouponId" INTEGER,
ADD COLUMN     "usePoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "description" TEXT,
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'SLEEPWEAR';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "couponDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pointsDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "customSizeChart" JSONB,
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'SLEEPWEAR',
ADD COLUMN     "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "color",
ADD COLUMN     "colorName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ProductView" ADD COLUMN     "source" TEXT,
ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "memberTier" TEXT NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "pointBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attribute" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SELECT',
    "isFilterable" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeValue" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "meta" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "attributeId" INTEGER NOT NULL,

    CONSTRAINT "AttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryAttribute" (
    "categoryId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryAttribute_pkey" PRIMARY KEY ("categoryId","attributeId")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "productId" INTEGER NOT NULL,
    "attributeValueId" INTEGER NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("productId","attributeValueId")
);

-- CreateTable
CREATE TABLE "AboutSection" (
    "id" SERIAL NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostBookmark" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationClick" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "sessionId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "sourceProductId" INTEGER,
    "algorithm" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sectionType" TEXT NOT NULL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "variantName" TEXT,
    "fitType" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedBy" INTEGER,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewHelpful" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewHelpful_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'DISCOUNT',
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "maxDiscount" DOUBLE PRECISION,
    "minOrderValue" DOUBLE PRECISION,
    "quantity" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsagePerUser" INTEGER NOT NULL DEFAULT 1,
    "couponType" TEXT NOT NULL DEFAULT 'PUBLIC',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "campaignId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCoupon" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedOrderId" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'COLLECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponUsage" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "userId" INTEGER,
    "orderId" INTEGER NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "orderTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "description" TEXT,
    "adjustedBy" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointReward" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointCost" INTEGER NOT NULL,
    "rewardType" TEXT NOT NULL,
    "couponId" INTEGER,
    "discountValue" DOUBLE PRECISION,
    "discountType" TEXT,
    "quantity" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "maxPerUser" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rewardId" INTEGER NOT NULL,
    "pointSpent" INTEGER NOT NULL,
    "resultType" TEXT NOT NULL,
    "resultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchLog" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "userId" INTEGER,
    "sessionId" TEXT,
    "results" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchSynonym" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "synonym" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchSynonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchKeyword" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "displayName" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChartTemplate" (
    "id" SERIAL NOT NULL,
    "productType" "ProductType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "headers" JSONB NOT NULL,
    "sizes" JSONB NOT NULL,
    "measurements" JSONB NOT NULL,
    "tips" JSONB NOT NULL,
    "internationalSizes" JSONB,
    "measurementImage" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeChartTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "preferredSizes" JSONB,
    "colorAffinities" JSONB,
    "styleAffinities" JSONB,
    "avgOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceRange" JSONB,
    "categoryWeights" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'website',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationExpiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "welcomeCouponCode" TEXT,
    "welcomeCouponUsedAt" TIMESTAMP(3),
    "welcomeCouponOrderId" INTEGER,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelcomeCouponUsage" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WelcomeCouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_slug_key" ON "Attribute"("slug");

-- CreateIndex
CREATE INDEX "Attribute_isFilterable_order_idx" ON "Attribute"("isFilterable", "order");

-- CreateIndex
CREATE INDEX "AttributeValue_attributeId_idx" ON "AttributeValue"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeValue_attributeId_slug_key" ON "AttributeValue"("attributeId", "slug");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeValueId_idx" ON "ProductAttributeValue"("attributeValueId");

-- CreateIndex
CREATE UNIQUE INDEX "AboutSection_sectionKey_key" ON "AboutSection"("sectionKey");

-- CreateIndex
CREATE INDEX "AboutSection_sectionKey_idx" ON "AboutSection"("sectionKey");

-- CreateIndex
CREATE INDEX "AboutSection_isActive_order_idx" ON "AboutSection"("isActive", "order");

-- CreateIndex
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");

-- CreateIndex
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "PostBookmark_postId_idx" ON "PostBookmark"("postId");

-- CreateIndex
CREATE INDEX "PostBookmark_userId_idx" ON "PostBookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostBookmark_postId_userId_key" ON "PostBookmark"("postId", "userId");

-- CreateIndex
CREATE INDEX "RecommendationClick_productId_createdAt_idx" ON "RecommendationClick"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationClick_sourceProductId_idx" ON "RecommendationClick"("sourceProductId");

-- CreateIndex
CREATE INDEX "RecommendationClick_algorithm_createdAt_idx" ON "RecommendationClick"("algorithm", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationClick_sessionId_idx" ON "RecommendationClick"("sessionId");

-- CreateIndex
CREATE INDEX "RecommendationClick_purchased_idx" ON "RecommendationClick"("purchased");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_invitations_token_key" ON "admin_invitations"("token");

-- CreateIndex
CREATE INDEX "admin_invitations_token_idx" ON "admin_invitations"("token");

-- CreateIndex
CREATE INDEX "admin_invitations_email_idx" ON "admin_invitations"("email");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Review_productId_userId_orderId_key" ON "Review"("productId", "userId", "orderId");

-- CreateIndex
CREATE INDEX "ReviewImage_reviewId_idx" ON "ReviewImage"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewHelpful_reviewId_idx" ON "ReviewHelpful"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewHelpful_reviewId_visitorId_key" ON "ReviewHelpful"("reviewId", "visitorId");

-- CreateIndex
CREATE INDEX "ContactMessage_status_idx" ON "ContactMessage"("status");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_isActive_startDate_endDate_idx" ON "Campaign"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Campaign_slug_idx" ON "Campaign"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_category_isActive_idx" ON "Coupon"("category", "isActive");

-- CreateIndex
CREATE INDEX "Coupon_couponType_isActive_idx" ON "Coupon"("couponType", "isActive");

-- CreateIndex
CREATE INDEX "Coupon_isPublic_isActive_idx" ON "Coupon"("isPublic", "isActive");

-- CreateIndex
CREATE INDEX "Coupon_startDate_endDate_idx" ON "Coupon"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Coupon_campaignId_idx" ON "Coupon"("campaignId");

-- CreateIndex
CREATE INDEX "UserCoupon_userId_status_idx" ON "UserCoupon"("userId", "status");

-- CreateIndex
CREATE INDEX "UserCoupon_couponId_idx" ON "UserCoupon"("couponId");

-- CreateIndex
CREATE INDEX "UserCoupon_expiresAt_idx" ON "UserCoupon"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCoupon_userId_couponId_key" ON "UserCoupon"("userId", "couponId");

-- CreateIndex
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");

-- CreateIndex
CREATE INDEX "CouponUsage_userId_idx" ON "CouponUsage"("userId");

-- CreateIndex
CREATE INDEX "CouponUsage_orderId_idx" ON "CouponUsage"("orderId");

-- CreateIndex
CREATE INDEX "PointHistory_userId_createdAt_idx" ON "PointHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointHistory_type_idx" ON "PointHistory"("type");

-- CreateIndex
CREATE INDEX "PointHistory_source_idx" ON "PointHistory"("source");

-- CreateIndex
CREATE INDEX "PointReward_isActive_pointCost_idx" ON "PointReward"("isActive", "pointCost");

-- CreateIndex
CREATE INDEX "RewardRedemption_userId_idx" ON "RewardRedemption"("userId");

-- CreateIndex
CREATE INDEX "RewardRedemption_rewardId_idx" ON "RewardRedemption"("rewardId");

-- CreateIndex
CREATE INDEX "SearchLog_keyword_idx" ON "SearchLog"("keyword");

-- CreateIndex
CREATE INDEX "SearchLog_createdAt_idx" ON "SearchLog"("createdAt");

-- CreateIndex
CREATE INDEX "SearchLog_userId_idx" ON "SearchLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchSynonym_word_key" ON "SearchSynonym"("word");

-- CreateIndex
CREATE INDEX "SearchSynonym_word_idx" ON "SearchSynonym"("word");

-- CreateIndex
CREATE INDEX "SearchSynonym_isActive_idx" ON "SearchSynonym"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SearchKeyword_keyword_key" ON "SearchKeyword"("keyword");

-- CreateIndex
CREATE INDEX "SearchKeyword_isActive_order_idx" ON "SearchKeyword"("isActive", "order");

-- CreateIndex
CREATE INDEX "SearchKeyword_keyword_idx" ON "SearchKeyword"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "SizeChartTemplate_productType_key" ON "SizeChartTemplate"("productType");

-- CreateIndex
CREATE INDEX "SizeChartTemplate_productType_idx" ON "SizeChartTemplate"("productType");

-- CreateIndex
CREATE INDEX "SizeChartTemplate_isActive_idx" ON "SizeChartTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_verificationToken_key" ON "NewsletterSubscriber"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_welcomeCouponCode_key" ON "NewsletterSubscriber"("welcomeCouponCode");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_email_idx" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_isActive_idx" ON "NewsletterSubscriber"("isActive");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_verificationToken_idx" ON "NewsletterSubscriber"("verificationToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_welcomeCouponCode_idx" ON "NewsletterSubscriber"("welcomeCouponCode");

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeCouponUsage_phone_key" ON "WelcomeCouponUsage"("phone");

-- CreateIndex
CREATE INDEX "WelcomeCouponUsage_phone_idx" ON "WelcomeCouponUsage"("phone");

-- CreateIndex
CREATE INDEX "WelcomeCouponUsage_email_idx" ON "WelcomeCouponUsage"("email");

-- CreateIndex
CREATE INDEX "Cart_discountCouponId_idx" ON "Cart"("discountCouponId");

-- CreateIndex
CREATE INDEX "Cart_shippingCouponId_idx" ON "Cart"("shippingCouponId");

-- CreateIndex
CREATE INDEX "Cart_lastAbandonedAt_idx" ON "Cart"("lastAbandonedAt");

-- CreateIndex
CREATE INDEX "Category_productType_idx" ON "Category"("productType");

-- CreateIndex
CREATE INDEX "Order_couponCode_idx" ON "Order"("couponCode");

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");

-- CreateIndex
CREATE INDEX "ProductVariant_colorName_idx" ON "ProductVariant"("colorName");

-- CreateIndex
CREATE INDEX "ProductVariant_size_idx" ON "ProductVariant"("size");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_size_colorName_key" ON "ProductVariant"("productId", "size", "colorName");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_size_color_key" ON "ProductVariant"("productId", "size", "colorName");

-- CreateIndex
CREATE INDEX "ProductView_source_idx" ON "ProductView"("source");

-- CreateIndex
CREATE INDEX "User_memberTier_idx" ON "User"("memberTier");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAttribute" ADD CONSTRAINT "CategoryAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAttribute" ADD CONSTRAINT "CategoryAttribute_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostBookmark" ADD CONSTRAINT "PostBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostBookmark" ADD CONSTRAINT "PostBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_discountCouponId_fkey" FOREIGN KEY ("discountCouponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_shippingCouponId_fkey" FOREIGN KEY ("shippingCouponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewImage" ADD CONSTRAINT "ReviewImage_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHelpful" ADD CONSTRAINT "ReviewHelpful_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointHistory" ADD CONSTRAINT "PointHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "PointReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
