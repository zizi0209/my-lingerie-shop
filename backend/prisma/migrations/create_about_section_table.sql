-- Migration: Create AboutSection table
-- Description: Tạo bảng AboutSection cho trang About Us với layout cố định

CREATE TABLE IF NOT EXISTS "AboutSection" (
  "id" SERIAL PRIMARY KEY,
  "sectionKey" VARCHAR(255) NOT NULL UNIQUE,
  "title" VARCHAR(255),
  "subtitle" VARCHAR(255),
  "content" TEXT,
  "imageUrl" VARCHAR(500),
  "metadata" JSONB,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX "AboutSection_sectionKey_idx" ON "AboutSection"("sectionKey");
CREATE INDEX "AboutSection_isActive_order_idx" ON "AboutSection"("isActive", "order");

-- Insert default sections
INSERT INTO "AboutSection" ("sectionKey", "title", "subtitle", "order", "isActive") VALUES
  ('hero', 'Về Chúng Tôi', 'Câu chuyện của chúng tôi', 0, true),
  ('story', 'Câu Chuyện Thương Hiệu', 'Hành trình phát triển', 1, true),
  ('values', 'Giá Trị Cốt Lõi', 'Những điều chúng tôi tin tưởng', 2, true),
  ('team', 'Đội Ngũ & Xưởng Sản Xuất', 'Những người đằng sau sản phẩm', 3, true),
  ('cta', 'Hãy Khám Phá Sản Phẩm', 'Trải nghiệm ngay hôm nay', 4, true)
ON CONFLICT ("sectionKey") DO NOTHING;
