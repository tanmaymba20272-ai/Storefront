-- 02_reserve_conflict.sql
-- Script to exercise reserve_inventory RPC concurrently.
-- This file contains SQL snippets to run in two psql sessions.

-- Setup: ensure product exists
-- INSERT INTO public.products (id, sku, name, inventory, reserved_count, price_cents, currency) VALUES ('00000000-0000-0000-0000-000000000001','TEST-SKU-1','Test item',1,0,1000,'INR');

-- Session A
-- BEGIN;
-- SELECT public.reserve_inventory('[{"sku":"TEST-SKU-1","quantity":1}]'::jsonb, '11111111-1111-1111-1111-111111111111'::uuid);
-- -- keep transaction open (simulate long processing before payment)

-- Session B (run while Session A still holds locks)
-- BEGIN;
-- SELECT public.reserve_inventory('[{"sku":"TEST-SKU-1","quantity":1}]'::jsonb, '22222222-2222-2222-2222-222222222222'::uuid);
-- Expected: Session B's call should return { success: false, error: 'INVENTORY_EXHAUSTED', sku: 'TEST-SKU-1' } or block until Session A commits/rolls back.

-- Cleanup examples (run as admin/service role):
-- SELECT public.release_reservation('11111111-1111-1111-1111-111111111111'::uuid);
-- SELECT public.release_reservation('22222222-2222-2222-2222-222222222222'::uuid);

-- Optional Node.js snippet (run two processes concurrently):
-- const { Client } = require('pg');
-- async function callReserve(orderId) {
--   const c = new Client({ connectionString: process.env.TEST_DATABASE_URL });
--   await c.connect();
--   const res = await c.query("SELECT public.reserve_inventory($1::jsonb, $2::uuid)", [JSON.stringify([{ sku: 'TEST-SKU-1', quantity: 1 }]), orderId]);
--   console.log(orderId, res.rows);
--   await c.end();
-- }
-- run concurrently: node callReserve('1111...') and node callReserve('2222...')
-- 02_reserve_conflict.sql
-- This file explains how to test concurrent reservation conflicts.

-- Steps to reproduce (manual guidance):
-- 1) Ensure a product exists with inventory = 1 and reserved_count = 0.
--    INSERT INTO public.products (id, sku, name, price_cents, currency, inventory, reserved_count)
--    VALUES (gen_random_uuid(), 'TEST-SKU-CONFLICT', 'Conflict Product', 10000, 'INR', 1, 0)
--    ON CONFLICT (sku) DO UPDATE SET inventory = 1, reserved_count = 0;
--
-- 2) Open two database sessions (A and B). In both sessions begin a transaction:
--    BEGIN;
--
-- 3) In session A run the reservation RPC but DO NOT commit yet:
--    SELECT public.reserve_inventory('[{"sku":"TEST-SKU-CONFLICT","quantity":1}]'::jsonb, gen_random_uuid()::uuid);
--    -- This will lock the product row (FOR UPDATE) and insert a reservation when completed.
--
-- 4) In session B attempt the same reservation simultaneously:
--    SELECT public.reserve_inventory('[{"sku":"TEST-SKU-CONFLICT","quantity":1}]'::jsonb, gen_random_uuid()::uuid);
--
-- Expected behavior:
-- - One of the sessions will succeed and return {success: true}.
-- - The other will either block until the first commits and then return INVENTORY_EXHAUSTED
--   (since reserved_count will have been incremented), or will receive INVENTORY_EXHAUSTED if it runs after the first commit.
-- - This demonstrates row-level locking via FOR UPDATE prevents oversell when combined with reserved_count.

-- Notes:
-- - Use short transactions when testing. The function uses FOR UPDATE to serialize checks and updates.
-- - For automated testing harnesses, run concurrent connections to assert only one reservation can consume the last unit.
