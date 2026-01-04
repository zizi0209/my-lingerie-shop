-- 1. Create COLOR attribute if not exists
INSERT INTO "Attribute" (name, slug, type, "isFilterable", "order", "createdAt", "updatedAt")
SELECT 'Màu sắc', 'mau-sac', 'COLOR', true, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Attribute" WHERE type = 'COLOR');

-- 2. Migrate existing colors to AttributeValue
INSERT INTO "AttributeValue" ("attributeId", value, slug, meta, "order", "createdAt", "updatedAt")
SELECT 
  (SELECT id FROM "Attribute" WHERE type = 'COLOR' LIMIT 1),
  c.name,
  LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(c.name, 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'),
      '[^a-z0-9]+', '-', 'g'
    ), '(^-|-$)', '', 'g'
  )),
  jsonb_build_object('hexCode', c."hexCode"),
  c."order",
  NOW(),
  NOW()
FROM "Color" c
WHERE NOT EXISTS (
  SELECT 1 FROM "AttributeValue" av 
  WHERE av."attributeId" = (SELECT id FROM "Attribute" WHERE type = 'COLOR' LIMIT 1)
  AND av.value = c.name
);
