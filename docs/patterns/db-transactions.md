# Database Pattern: High-Concurrency Inventory Locking

When building checkout or cart reservation functions for limited drops, we MUST prevent race conditions and overselling. 

## The Standard
Never decrement inventory using separate `SELECT` and `UPDATE` calls from the client or edge function. 
Always use a Supabase RPC (Remote Procedure Call) that executes a PostgreSQL transaction with row-level locking (`FOR UPDATE`).

## Example Implementation (PL/pgSQL):
```sql
CREATE OR REPLACE FUNCTION reserve_inventory(product_id UUID, quantity INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  available_stock INT;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT stock INTO available_stock 
  FROM products 
  WHERE id = product_id 
  FOR UPDATE;

  IF available_stock >= quantity THEN
    UPDATE products SET stock = stock - quantity WHERE id = product_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE; -- Oversell prevented
  END IF;
END;
$$;