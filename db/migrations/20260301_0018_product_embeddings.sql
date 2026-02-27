-- Sprint 12: pgvector extension and product embeddings for semantic search

-- Enable pgvector extension (required for vector similarity search)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to products table (nullable until backfill is complete)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- RPC: Match products by semantic similarity to a query embedding
-- Returns top N products ranked by cosine similarity (1 - distance)
-- SECURITY DEFINER ensures only the RLS policy on products table is checked
CREATE OR REPLACE FUNCTION public.match_products(
  query_embedding vector,
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  price_cents int,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.name,
    p.slug,
    p.price_cents,
    (1 - (p.embedding <=> query_embedding))::float AS similarity
  FROM public.products p
  WHERE p.embedding IS NOT NULL
    AND p.status = 'active'
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create index for efficient cosine similarity search (IVFFlat for speed)
-- lists=100 is a reasonable default for moderate-sized product catalogs (<100k products)
CREATE INDEX IF NOT EXISTS products_embedding_idx
ON public.products
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Grant execute permission to all users (RLS on products table will be the gatekeeper)
GRANT EXECUTE ON FUNCTION public.match_products(vector, int) TO authenticated, anon;
