-- Create COLOR attribute
INSERT INTO "Attribute" (name, slug, type, "isFilterable", "order", "createdAt", "updatedAt")
VALUES ('Màu sắc', 'mau-sac', 'COLOR', true, 0, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Insert color values
INSERT INTO "AttributeValue" ("attributeId", value, slug, meta, "order")
SELECT 
  (SELECT id FROM "Attribute" WHERE slug = 'mau-sac'),
  v.name,
  v.slug,
  v.meta::jsonb,
  v.ord
FROM (VALUES
  ('Đen', 'den', '{"hexCode": "#000000"}', 0),
  ('Trắng', 'trang', '{"hexCode": "#FFFFFF"}', 1),
  ('Hồng', 'hong', '{"hexCode": "#FFC0CB"}', 2),
  ('Đỏ', 'do', '{"hexCode": "#FF0000"}', 3),
  ('Nude', 'nude', '{"hexCode": "#E8BEAC"}', 4),
  ('Be', 'be', '{"hexCode": "#F5F5DC"}', 5),
  ('Xám', 'xam', '{"hexCode": "#808080"}', 6),
  ('Xanh dương', 'xanh-duong', '{"hexCode": "#0000FF"}', 7),
  ('Tím', 'tim', '{"hexCode": "#800080"}', 8),
  ('Nâu', 'nau', '{"hexCode": "#8B4513"}', 9)
) AS v(name, slug, meta, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM "AttributeValue" 
  WHERE "attributeId" = (SELECT id FROM "Attribute" WHERE slug = 'mau-sac')
  AND slug = v.slug
);
