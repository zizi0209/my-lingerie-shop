-- Migration script: Migrate Color data to Attribute system
-- Run this AFTER applying the schema changes

-- 1. Create COLOR attribute if not exists
INSERT INTO "Attribute" (name, slug, type, "isFilterable", "order", "createdAt", "updatedAt")
SELECT 'Màu sắc', 'mau-sac', 'COLOR', true, 0, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Attribute" WHERE type = 'COLOR'
);

-- 2. Get the COLOR attribute ID
-- (Run separately or use a DO block in PostgreSQL)

-- 3. Migrate existing colors to AttributeValue
-- Note: You need to replace @colorAttributeId with the actual ID
/*
INSERT INTO "AttributeValue" ("attributeId", value, slug, meta, "order", "createdAt", "updatedAt")
SELECT 
  @colorAttributeId,
  name,
  LOWER(REPLACE(name, ' ', '-')),
  json_build_object('hexCode', "hexCode"),
  "order",
  NOW(),
  NOW()
FROM "Color"
WHERE NOT EXISTS (
  SELECT 1 FROM "AttributeValue" av 
  WHERE av."attributeId" = @colorAttributeId AND av.value = "Color".name
);
*/

-- 4. Update ProductVariant: rename 'color' column to 'colorName'
-- This is handled in the Prisma schema change

-- 5. After verification, you can drop the Color table if it exists
-- DROP TABLE IF EXISTS "Color" CASCADE;
