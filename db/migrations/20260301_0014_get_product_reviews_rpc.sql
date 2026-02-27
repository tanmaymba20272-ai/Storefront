-- Migration: 20260301_0014_get_product_reviews_rpc.sql
-- Create SECURITY DEFINER RPC to fetch ordered product reviews with tiers

BEGIN;

-- Create function to return a safe subset of review fields with ordering by tiers
CREATE OR REPLACE FUNCTION public.get_product_reviews(
  product_uuid uuid,
  limit_rows int DEFAULT 20,
  offset_rows int DEFAULT 0
) RETURNS TABLE(
  id uuid,
  product_id uuid,
  user_id uuid,
  rating int,
  body text,
  media_urls text[],
  helpful_count int,
  verified_purchase boolean,
  created_at timestamptz
) LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    r.id,
    r.product_id,
    r.user_id,
    r.rating,
    r.body,
    r.media_urls,
    r.helpful_count,
    r.verified_purchase,
    r.created_at
  FROM (
    SELECT *,
      CASE
        WHEN r.rating = 5 AND coalesce(array_length(r.media_urls,1),0) > 0 THEN 1
        WHEN r.rating = 4 AND coalesce(array_length(r.media_urls,1),0) > 0 THEN 2
        WHEN r.rating = 5 AND (r.media_urls IS NULL OR array_length(r.media_urls,1) = 0) THEN 3
        ELSE 4
      END AS tier
    FROM reviews r
    WHERE r.product_id = product_uuid
  ) r
  ORDER BY tier ASC, r.helpful_count DESC, r.created_at DESC
  LIMIT limit_rows OFFSET offset_rows;
$$;

-- IMPORTANT: Because this is SECURITY DEFINER, make sure the function owner is a role with appropriate privileges (typically the DB owner or service role)
-- You may wish to `ALTER FUNCTION public.get_product_reviews(...) OWNER TO postgres;` or the service role user in your environment.

-- Optionally grant execute to authenticated/anonymous roles as needed:
-- GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid, int, int) TO authenticated;

COMMIT;
