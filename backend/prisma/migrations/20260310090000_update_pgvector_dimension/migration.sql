-- Update pgvector embedding dimension to match voyage-4-lite (1024)
DROP INDEX IF EXISTS "idx_product_embedding_vector";

ALTER TABLE "ProductEmbedding"
  ALTER COLUMN "embedding" TYPE vector(1024);

CREATE INDEX IF NOT EXISTS "idx_product_embedding_vector"
  ON "ProductEmbedding" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
