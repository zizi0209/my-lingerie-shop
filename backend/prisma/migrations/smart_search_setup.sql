-- Smart Search Setup for PostgreSQL
-- Run this script on your PostgreSQL database

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Create immutable unaccent function (required for index)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent($1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- 3. Create trigram index for fuzzy search on Product name
CREATE INDEX IF NOT EXISTS idx_product_name_trgm 
ON "Product" USING GIN(name gin_trgm_ops);

-- 4. Create trigram index for unaccented search (Vietnamese)
CREATE INDEX IF NOT EXISTS idx_product_name_unaccent_trgm 
ON "Product" USING GIN(immutable_unaccent(name) gin_trgm_ops);

-- 5. Create trigram index for Category name
CREATE INDEX IF NOT EXISTS idx_category_name_trgm 
ON "Category" USING GIN(name gin_trgm_ops);
