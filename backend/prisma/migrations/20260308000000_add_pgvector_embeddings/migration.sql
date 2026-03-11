-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Store product embeddings for pgvector search
CREATE TABLE IF NOT EXISTS "ProductEmbedding" (
  "productId" INTEGER PRIMARY KEY REFERENCES "Product" ("id") ON DELETE CASCADE,
  "embedding" vector(768) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_product_embedding_vector"
  ON "ProductEmbedding" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS "idx_product_embedding_updated_at"
  ON "ProductEmbedding" ("updatedAt");
