 -- CreateTable Color (Master Data)
 CREATE TABLE "Color" (
     "id" SERIAL NOT NULL,
     "name" TEXT NOT NULL,
     "slug" TEXT NOT NULL,
     "hexCode" TEXT NOT NULL,
     "order" INTEGER NOT NULL DEFAULT 0,
     "isActive" BOOLEAN NOT NULL DEFAULT true,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL,
 
     CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
 );
 
 -- CreateTable ProductColor (Product-Color relationship)
 CREATE TABLE "ProductColor" (
     "id" SERIAL NOT NULL,
     "productId" INTEGER NOT NULL,
     "colorId" INTEGER NOT NULL,
     "isDefault" BOOLEAN NOT NULL DEFAULT false,
     "order" INTEGER NOT NULL DEFAULT 0,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 
     CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("id")
 );
 
 -- CreateIndex Color
 CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");
 CREATE UNIQUE INDEX "Color_slug_key" ON "Color"("slug");
 CREATE INDEX "Color_slug_idx" ON "Color"("slug");
 CREATE INDEX "Color_isActive_order_idx" ON "Color"("isActive", "order");
 
 -- CreateIndex ProductColor
 CREATE UNIQUE INDEX "ProductColor_productId_colorId_key" ON "ProductColor"("productId", "colorId");
 CREATE INDEX "ProductColor_productId_idx" ON "ProductColor"("productId");
 CREATE INDEX "ProductColor_colorId_idx" ON "ProductColor"("colorId");
 
 -- Seed default colors
 INSERT INTO "Color" ("name", "slug", "hexCode", "order", "updatedAt") VALUES
 ('Đen', 'den', '#000000', 1, NOW()),
 ('Trắng', 'trang', '#FFFFFF', 2, NOW()),
 ('Hồng', 'hong', '#FFC0CB', 3, NOW()),
 ('Nude', 'nude', '#E8BEAC', 4, NOW()),
 ('Đỏ đô', 'do-do', '#8B0000', 5, NOW()),
 ('Navy', 'navy', '#000080', 6, NOW()),
 ('Đỏ', 'do', '#FF0000', 7, NOW()),
 ('Xanh dương', 'xanh-duong', '#0000FF', 8, NOW()),
 ('Xanh lá', 'xanh-la', '#00FF00', 9, NOW()),
 ('Tím', 'tim', '#800080', 10, NOW()),
 ('Be', 'be', '#F5F5DC', 11, NOW()),
 ('Xám', 'xam', '#808080', 12, NOW()),
 ('Nâu', 'nau', '#8B4513', 13, NOW()),
 ('Vàng', 'vang', '#FFD700', 14, NOW()),
 ('Cam', 'cam', '#FFA500', 15, NOW()),
 ('Rượu vang', 'ruou-vang', '#722F37', 16, NOW());
 
 -- Add colorId to ProductImage (nullable for general images)
 ALTER TABLE "ProductImage" ADD COLUMN "colorId" INTEGER;
 CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");
 CREATE INDEX "ProductImage_colorId_idx" ON "ProductImage"("colorId");
 
 -- Add colorId to ProductVariant (required)
 -- Step 1: Add column as nullable first
 ALTER TABLE "ProductVariant" ADD COLUMN "colorId" INTEGER;
 
 -- Step 2: Create temporary mapping from colorName to colorId
 UPDATE "ProductVariant" pv
 SET "colorId" = c.id
 FROM "Color" c
 WHERE LOWER(pv."colorName") = LOWER(c."name")
    OR pv."colorName" = c."name";
 
 -- Step 3: For variants with colorName not matching, create new colors or assign to first color
 UPDATE "ProductVariant"
 SET "colorId" = (SELECT MIN(id) FROM "Color")
 WHERE "colorId" IS NULL;
 
 -- Step 4: Make colorId NOT NULL
 ALTER TABLE "ProductVariant" ALTER COLUMN "colorId" SET NOT NULL;
 
 -- Step 5: Drop old colorName column
 ALTER TABLE "ProductVariant" DROP COLUMN "colorName";
 
 -- Step 6: Update indexes
 DROP INDEX IF EXISTS "ProductVariant_productId_size_color_key";
 DROP INDEX IF EXISTS "ProductVariant_productId_size_colorName_key";
 CREATE UNIQUE INDEX "ProductVariant_productId_size_colorId_key" ON "ProductVariant"("productId", "size", "colorId");
 CREATE INDEX "ProductVariant_colorId_idx" ON "ProductVariant"("colorId");
 
 -- AddForeignKey
 ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
 ALTER TABLE "ProductColor" ADD CONSTRAINT "ProductColor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 ALTER TABLE "ProductColor" ADD CONSTRAINT "ProductColor_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
 
 -- Populate ProductColor from existing variants
 INSERT INTO "ProductColor" ("productId", "colorId", "isDefault", "order", "createdAt")
 SELECT DISTINCT pv."productId", pv."colorId", false, 0, NOW()
 FROM "ProductVariant" pv
 ON CONFLICT ("productId", "colorId") DO NOTHING;
 
 -- Set first color as default for each product
 UPDATE "ProductColor" pc
 SET "isDefault" = true
 WHERE pc.id IN (
     SELECT DISTINCT ON ("productId") id
     FROM "ProductColor"
     ORDER BY "productId", "colorId"
 );
