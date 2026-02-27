# API Contract & Frontend Cart Flow

## Frontend cart flow

- Cart is stored in a persisted `zustand` store (`store/cartStore.ts`) and guarded by `useHydrated()` to avoid SSR hydration mismatch.
- When user clicks **Proceed to checkout** the UI performs an optimistic validation:
  1. Disable the checkout button and show a loading state.
 2. POST current cart items to `/api/validate-cart` which calls the Supabase RPC `validate_cart` on the server.
 3. RPC returns `{ valid: boolean; errors: any[]; adjusted_items: any[] }`.
 4. If `valid` → navigate to `/checkout`.
 5. If `invalid` → apply `adjusted_items` locally (update quantities or remove items) and show error banners.

- The Cart Drawer is now mounted from the site header and will navigate to `/checkout` after successful validation.

### Example client call

```ts
await fetch('/api/validate-cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items: cartItems, customerId }),
})
```

## Frontend Checkout Flow

Example client usage for the `POST /api/checkout` flow and how to open Razorpay's checkout with the returned values:

```ts
const res = await fetch('/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cart_items, shipping_address }),
  credentials: 'include',
})
if (!res.ok) throw new Error('Checkout initialization failed')
const payload = await res.json()
// payload: { razorpay_order_id, razorpay_key_id, amount_paise, currency }

// idempotent SDK load
if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
  const s = document.createElement('script')
  s.src = 'https://checkout.razorpay.com/v1/checkout.js'
  s.async = true
  document.body.appendChild(s)
  await new Promise((resolve, reject) => {
    s.onload = resolve
    s.onerror = reject
  })
}

const Razorpay = (window as any).Razorpay
const r = new Razorpay({
  key: payload.razorpay_key_id,
  amount: payload.amount_paise,
  currency: payload.currency,
  order_id: payload.razorpay_order_id,
  handler: (response: any) => {
    // payment success handling (server will verify and finalize)
  },
  prefill: { name: shipping_address.fullName, contact: shipping_address.phone },
  modal: { ondismiss: () => { /* handle dismissal */ } }
})
r.open()
```

Notes:
- The frontend should never include Razorpay secret keys; use only the public `razorpay_key_id` returned by the server.
- Handle 409 `INVENTORY_EXHAUSTED` responses by applying `adjusted_items` to the local cart and showing inline errors before retrying checkout.


### Notes
- The server wrapper `lib/actions/cart.ts` uses `getServerSupabase()` and calls the `validate_cart` RPC. Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in the server environment.
- The frontend expects `adjusted_items` to be an array of `{ sku, quantity }` and `errors` to include `{ sku, message }`.
# API Contract

## Validate Cart RPC

RPC signature:

```
public.validate_cart(cart_items jsonb, customer_id uuid DEFAULT NULL) RETURNS jsonb
```

Request payload (example):

```json
[ { "sku": "SKU-A", "quantity": 2 }, { "sku": "SKU-B", "quantity": 1 } ]
```

Example SQL call:

```sql
SELECT public.validate_cart('[{"sku":"SKU-A","quantity":2}]'::jsonb, '00000000-0000-0000-0000-000000000000'::uuid);
```

Example response (valid):

```json
{
  "valid": true,
  "errors": [],
  "adjusted_items": [ { "sku": "SKU-A", "adjusted_quantity": 2 } ]
}
```

Example response (shortfall):

```json
{
  "valid": false,
  "errors": [ { "sku": "SKU-B", "requested": 5, "available": 2 } ],
  "adjusted_items": [ { "sku": "SKU-B", "adjusted_quantity": 2 } ]
}
```

Recommended client flow:

- **Validate**: Client calls `validate_cart` to check availability and receive `adjusted_items`.
- **(Optional) Hold**: Call a separate `rpc.hold_cart` (not implemented here) to create
  a short-lived reservation (server-managed `reserved_count`) for the validated items.
- **Checkout**: Complete payment and finalize inventory updates on the server.

Notes:
- The `validate_cart` RPC is validation-only and does not change inventory. To avoid
  oversell in high-concurrency drops, use a two-step pattern: `validate_cart` -> `hold_cart` -> `checkout`.
- `hold_cart` should be a SECURITY DEFINER RPC owned by the service role that increments
  `reserved_count` within a transaction and sets an expiry (e.g. `hold_ttl_seconds`).
- Ensure that `validate_cart` and any inventory-modifying RPCs are called from server-side
  code running with the appropriate service credentials. Do not grant public clients
  permission to update `products.inventory` or `products.reserved_count` directly.
# API Contract — TypeScript Interfaces

/*
  Notes:
  - These interfaces map 1:1 to the DB tables created in migrations.
  - UUIDs are represented as `string`.
  - Timestamps are ISO strings (`string`).
  - JSONB fields are represented as `Record<string, unknown>` when structured, else a generic object.
  - RLS expectations: `store_settings` is admin-only (read/write). Server-side operations should use the service role.
*/

## Chat API

### POST /api/chat

- **Purpose**: Real-time chat endpoint for shopping/support/general assistant functionality. Streams tokenized responses back to the client.
- **Runtime**: Edge (server-only). Rate-limited to 10 messages per minute per IP or per authenticated user (dev-only in-memory limiter; use Redis/Supabase KV in production).

- **Request JSON**:

```json
{
  "message": "string",
  "mode": "shopping" | "support" | "general",
  "order_id": "optional-string",
  "email": "optional-email-for-unauthenticated-support"
}
```

- **Auth rules**:
  - `shopping` and `general` modes are public (no auth required).
  - `support` mode requires an authenticated session. If unauthenticated, the client may provide `order_id` + `email` to lookup the order. Otherwise the endpoint returns `401` with a friendly message asking the user to sign in or provide order details.

- **Rate limiting**: 10 requests per minute per IP or per `auth.uid()` if authenticated. The current implementation is an in-memory sliding-window map (dev-only).

- **Context injection**:
  - `shopping`: the server queries up to 6 active products with inventory > 0 and injects a compact JSON summary (fields: `id, name, slug, price_cents, currency, images, description(<=120 chars), inventory_count`). Admin-only fields (e.g. `cost_price`, `internal_notes`) are never included.
  - `support`: the server queries the authenticated user's most recent order (or looks up by `order_id+email` when unauthenticated) and injects `{ id, shiprocket_order_id, fulfillment_status, created_at }`.
  - Injected context is sanitized and size-limited to avoid token overflows.

- **System prompt guarantees**:
  - The assistant must only recommend items present in the injected `products` context for shopping mode.
  - Never reveal `cost_price`, `internal_notes`, or admin-only secrets.
  - For support, only reference `fulfillment_status` and `shiprocket_order_id`. Do not fabricate AWB/shipment details.
  - Refuse to answer requests that would expose other users' data.

- **Streaming response**:
  - The route returns a streaming response (`text/event-stream` style). The server relays the provider's streaming tokens incrementally to the client.
  - Example client-side consumption (pseudo):

```js
const r = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message, mode }) })
const reader = r.body.getReader()
// read chunks and append to UI as they arrive
```

- **Errors**:
  - `400` — invalid request payload
  - `401` — support mode requires authentication or order_id+email
  - `429` — rate limit exceeded (Retry-After header returned)
  - `502` — upstream LLM provider failed or did not return a stream

### Notes

- The server resolves the LLM API key from `store_settings` key `LLM_API_KEY` (encrypted). The server helper `lib/utils/getLlmKey.ts` decrypts the value with `decryptSettings()` and returns `{ provider, apiKey }`. The decrypted value may be a plain API key string or JSON with `{ provider, apiKey }`.
- The current implementation supports OpenAI-style streaming. For other providers, extend the route to handle provider-specific streaming formats.

### GET /api/chat/history

- **Purpose**: Retrieve the chat message history for the authenticated user from the most recent session.
- **Authentication**: Required. Client must provide an `Authorization: Bearer <token>` header with a valid Supabase JWT.
- **Response**:

```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user" | "bot",
      "text": "string",
      "created_at": "ISO-8601 timestamp"
    }
  ]
}
```

- **Errors**:
  - `401` — No valid JWT provided or token verification failed.
  - `500` — Database query or session lookup failed.

- **Behavior**:
  - Queries `chat_sessions` table filtered by `user_id = auth.uid()` and ordered by `created_at DESC` (most recent first).
  - Retrieves the most recent session's messages from `chat_messages` table, ordered by `created_at ASC` (oldest first).
  - Returns up to 50 messages (respects LLM context window limits).
  - If no sessions exist for the user, returns an empty `messages` array.

- **Client usage**:
  - Called automatically by `ChatWidget` on mount if user is authenticated.
  - Used to restore conversation state and maintain context across page refreshes.
  - Frontend should gracefully handle failures (fallback to empty messages, silent continue).

## Webhooks

This application accepts Razorpay webhooks at `/api/webhooks/razorpay` and follows an idempotent processing contract.

- **Signature verification**: The route reads the raw request body (`await request.text()`), computes the HMAC using the server-side `RAZORPAY_WEBHOOK_SECRET` and compares it to the `x-razorpay-signature` header using `crypto.timingSafeEqual`. If verification fails, the endpoint returns `400` and makes no DB changes.

- **Event types handled**:
  - `order.paid` — payload path: `payload.order.entity.id` (this is the Razorpay order id). Handler will resolve `orders` by `razorpay_order_id`, call `public.finalize_inventory(order_uuid)`, then update `orders.status = 'paid'` and `paid_at = now()`.
  - `payment.captured` — payload path: `payload.payment.entity.order_id`. Treated the same as `order.paid`.
  - `payment.failed` — payload path: `payload.payment.entity.order_id`. Handler will call `public.fail_order(order_uuid)` and return `200`.

- **Idempotency contract**:
  - The webhook handler first looks up the row in `public.orders` by `razorpay_order_id` and checks `status`.
  - If `orders.status = 'paid'` the handler will not call `finalize_inventory` again and will return `200` (acknowledgement). This guarantees duplicate `order.paid` / `payment.captured` events do not double-decrement inventory.
  - `payment.failed` events result in `public.fail_order(order_uuid)` which itself calls `release_reservation(order_uuid)` and marks the order `failed`.

- **Payload paths summary**:
  - `order.paid` → `payload.order.entity.id` → maps to `orders.razorpay_order_id`
  - `payment.captured` → `payload.payment.entity.order_id` → maps to `orders.razorpay_order_id`
  - `payment.failed` → `payload.payment.entity.order_id` → maps to `orders.razorpay_order_id`

- **Operational notes**:
  - All DB calls are performed server-side with the Supabase service-role client; webhooks never expose secrets to clients.

## Email Broadcast API

### POST /api/admin/email/broadcast

- **Auth**: Admin session required. Server route verifies `profiles.role === 'admin'` using `getServerSupabase()`.
- **Payload**: JSON `{ subject: string, html: string, test?: boolean }`.
  - `test: true` sends only to the admin's email (useful for previewing). `test` omitted or false broadcasts to all recipients who have `marketing_opt_in = true` (fallback: all profiles with email).
- **Responses**:
  - 200 `{ sent: number }`
  - 4xx/5xx `{ error: string, message?: string }`

Security notes:
- The route reads the email provider key server-side (via `store_settings`) and must never serialize or return the secret. Server code should use `getEmailKey()` which decrypts the key server-side.
- Large recipient lists should be sent via a background queue/batch to avoid request-timeouts and rate limits.

## Sitemap

- The sitemap endpoint at `/sitemap.xml` (implemented in `app/sitemap.ts`) returns an XML `urlset` of absolute URLs built using the `NEXT_PUBLIC_SITE_URL` env var. Each `<url>` entry includes an optional `<lastmod>` ISO timestamp when available.
- Included items: base site root, published blog posts (`posts` table) at `/blog/:slug`, and published & active products at `/product/:handle`.
- If upgrading to a Next version that supports a `sitemap()` export, the server implementation can be converted to return an array of objects with `url` and `lastModified` fields instead of raw XML.
  - The DB RPCs `finalize_inventory` and `fail_order` are created `SECURITY DEFINER` and should be owned by the service-role DB user.
  - If the webhook receives an event with an unknown `razorpay_order_id` the handler will acknowledge with `200` to avoid repeated delivery by Razorpay; investigate missing orders separately.


export type UUID = string;
export type Timestamptz = string; // ISO 8601

export type UserRole = 'admin' | 'customer';
export type DropStatus = 'upcoming' | 'active' | 'closed';
export type PostStatus = 'draft' | 'published';

export interface Profile {
  id: UUID;
  email?: string | null;
  display_name?: string | null;
  role: UserRole;
  created_at: Timestamptz;
}

export interface Category {
  id: UUID;
  name: string;
  slug: string;
  metadata: Record<string, unknown>;
  created_at: Timestamptz;
}

export interface Drop {
  id: UUID;
  name: string;
  start_at?: Timestamptz | null;
  end_at?: Timestamptz | null;
  status: DropStatus;
  created_at: Timestamptz;
}

export interface Product {
  id: UUID;
  sku?: string | null;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  inventory_count: number;
  category_id?: UUID | null;
  drop_id?: UUID | null;
  metadata: Record<string, unknown>;
  created_at: Timestamptz;
}

export interface BlogPost {
  id: UUID;
  title: string;
  slug: string;
  content?: Record<string, unknown> | null; // JSONB content
  author_id?: UUID | null;
  published_at?: Timestamptz | null;
  status: PostStatus;
  created_at: Timestamptz;
}

export interface Review {
  id: UUID;
  product_id: UUID;
  author_id?: UUID | null;
  rating: number; // smallint (1-5)
  comment?: string | null;
  verified_purchase: boolean;
  created_at: Timestamptz;
}

export interface StoreSetting {
  id: number;
  key: string;
  value: string; // stored as plaintext here; RLS enforces admin only
  created_at: Timestamptz;
}

export interface ApiContract {
  profiles: Profile;
  categories: Category;
  drops: Drop;
  products: Product;
  blog_posts: BlogPost;
  reviews: Review;
  store_settings: StoreSetting; // Admin-only via RLS
}

/* RLS notes for frontend integrators:
 - `store_settings` should not be requested from client-side code unless the user is an admin.
 - Use server-side endpoints (with the Supabase service role) for operations that require admin privileges.
 - Public storefront reads (products, categories, drops, published blog_posts) are allowed for authenticated users.
/* Additional Backend Deliverables (Sprint 2)
 *
 * 1) Profiles auto-creation trigger
 *    - When a new row is inserted into `auth.users`, the DB trigger
 *      `public.create_profile_after_auth_user()` will ensure a matching

## Admin Fulfillment API

### POST /api/admin/orders/:id/fulfill

- **Purpose**: Create a Shiprocket manifest for an order, assign an AWB, and fetch the shipping label. This endpoint is admin-only and idempotent.
- **Auth**: Admin server session required (server-side `profiles.role === 'admin'`).
- **Path params**: `:id` — `orders.id` (UUID)

Request: POST with admin session (no body required)

Success (200):

```json
{
  "shiprocket_order_id": "SR12345",
  "shipment_id": "SHIP123",
  "awb_code": "AWB0001",
  "courier_name": "FastCourier",
  "label_url": "https://.../label.pdf"
}
```

Idempotency: If `orders.fulfillment_status !== 'unfulfilled'` the endpoint returns existing fulfillment fields and does not re-submit.

Error cases:
- 400 `SERVICE_UNAVAILABLE` — Shiprocket reports pincode/serviceability problems. Response: `{ error: 'SERVICE_UNAVAILABLE', details }`.
- 403 `FORBIDDEN` — caller is not an admin.
- 502 `SHIPROCKET_ERROR` — other third-party errors.

Server-side behavior summary:
- Validates admin session via `getServerSupabase()` and `profiles.role`.
- Reads `orders` row server-side and maps `items` and `shipping_address` into a simplified Shiprocket adhoc payload. Internal-only order fields are omitted.
- On Shiprocket success saves `shiprocket_order_id`, `shipment_id` and sets `fulfillment_status = 'manifested'`.
- Calls the AWB assign endpoint and saves `awb_code` and `courier_name`.
- Fetches the label; if Shiprocket returns a base64 label the server should persist it to object storage and save the storage URL in `orders.label_url` (current implementation stores a placeholder if base64 is returned).

## Orders table changes (fulfillment)

New columns added to `public.orders` for fulfillment integration:

- `shiprocket_order_id text`
- `shipment_id text`
- `awb_code text`
- `courier_name text`
- `label_url text` (URL to stored PDF or placeholder if base64)
- `fulfillment_status text` (default `'unfulfilled'`) — values: `'unfulfilled' | 'manifested' | 'in_transit' | 'delivered'` (example values)

Security notes:
- RLS should prevent non-admin writes to these columns. Admin-only backend processes and the DB service-role should be the only principals updating fulfillment fields.


## Success page note

- The storefront success page (`/checkout/success?order_id=<order_id>`) performs a server-side lookup against the `orders` table (via the server factory `getServerSupabase()`) to read order details by `id` (the implementation consumes `GET /orders?id=<order_id>` semantics server-side). The client-side cart is cleared only after the customer lands on this page — the clearing is performed by a client component that runs on mount.

 *      `public.profiles` row exists with `role = 'customer'` by default.
 *    - Server integrators: no extra server calls are required to create
 *      profiles; the trigger runs inside Postgres. If you rely on profile
 *      metadata shortly after signup, consider short retries on reads due to
 *      transactional propagation in some environments.
 *
 * 2) RPC: `search_products(query text, limit int)`
 *    - Returns product rows matching the `name` or `description` using
 *      Postgres full-text search (`to_tsvector`). Example SQL (server-side):
 */

/*
CREATE OR REPLACE FUNCTION public.search_products(q text, limit int DEFAULT 25)
RETURNS SETOF public.products
LANGUAGE sql STABLE
AS $$
  SELECT p.*
  FROM public.products p
  WHERE (
    to_tsvector('simple', coalesce(p.name, '')) || to_tsvector('simple', coalesce(p.description, ''))
  ) @@ plainto_tsquery('simple', q)
  ORDER BY ts_rank(
    to_tsvector('simple', coalesce(p.name, '')) || to_tsvector('simple', coalesce(p.description, '')),
    plainto_tsquery('simple', q)
  ) DESC
  LIMIT coalesce(limit, 25);
$$;
*/

## Public Catalog API

This section documents the server-side Server Actions implemented at `lib/actions/catalog.ts`.

- `getCategories(): Promise<CategoryListItem[]>`
  - Returns categories with fields: `id: string`, `name: string`, `slug: string`.

- `getPublishedProducts(opts?: { categorySlug?: string; sort?: 'price_asc'|'price_desc'|'newest'; limit?: number; offset?: number; query?: string }): Promise<ProductListItem[]>`
  - Returns products where `status = 'published'`.
  - Each item includes: `id, name, slug, price_cents, currency, metadata -> images (signed URLs), category: {id,name,slug}, drop: {id,name,start_at,end_at,status}`.
  - Supports server-side pagination (`limit`/`offset`), optional category filtering, optional sorting, and optional full-text `query` (uses `to_tsvector` when available).

- `getActiveAndUpcomingDrops(): Promise<DropListItem[]>`
  - Returns drops where `end_at > now()` OR `start_at > now()`, ordered by `start_at`.
  - Each item: `id, name, start_at, end_at, status`.

- `getProductBySlug(slug: string): Promise<ProductDetail | null>`
  - Returns full product detail for the given slug. Includes `inventory_count` (server-only), parsed `metadata` with `variants` and `images` (signed URLs), and related `category` and `drop` objects.

Note: These Server Actions never return admin-only fields (e.g., `cost_price`). Image storage keys are signed server-side and the public responses include short-lived signed URLs (15 minutes).

Security & Performance Notes:
- All filtering, pagination and searching is executed server-side and selects only necessary columns (avoid `SELECT *`).
- When `query` is provided, the actions prefer Postgres full-text search (`to_tsvector`) to leverage DB indexes. Otherwise they use indexed filters (e.g., category id) for performance.
- These endpoints are good candidates for short TTL edge caching (e.g., 60s) to reduce DB load during high-traffic drops.

## Checkout API

### POST /api/checkout

- **Purpose**: Server-side checkout endpoint. Reserves inventory, creates a Razorpay order, and inserts an `orders` row with status `pending`.
- **Request JSON**:

```json
{
  "cart_items": [ { "sku": "SKU-A", "quantity": 2 } ],
  "shipping_address": { "line1": "...", "city": "..." }
}
```

- **Response (200)**:

```json
{
  "razorpay_order_id": "order_XXXXXXXX",
  "razorpay_key_id": "rzp_test_xxx",
  "amount_paise": 20000,
  "currency": "INR"
}
```

- **Error Cases**:
  - 401 `AUTH_REQUIRED` — user must be authenticated (orders.user_id is NOT NULL in this sprint).

  ## Admin Email Broadcast (frontend notes)

  The admin Email Campaign UI (`app/(admin)/email-campaigns`) calls the broadcast endpoint as follows:

  - Endpoint: `POST /api/admin/email/broadcast`
  - Test payload: `{ subject: string, html: string, test: true }`
  - Broadcast payload: `{ subject: string, html: string, test: false }`
  - The frontend uses `fetch('/api/admin/email/broadcast', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })`.

  Notes:
  - The client should not include any API keys; the server endpoint is responsible for using service credentials.
  - The blog pages use Next's `generateMetadata()` to populate `title`, `description`, and OpenGraph/Twitter tags. Use `NEXT_PUBLIC_SITE_URL` to build absolute OG image/URLs.


## Admin Email Broadcast Endpoint

### POST /api/admin/email/broadcast

- **Purpose**: Send an HTML broadcast email to opted-in users (admin-only).
- **Auth**: Admin session required. Server uses `getServerSupabase()` and checks `profiles.role === 'admin'`.
- **Request JSON**:

```json
{ "subject": "string", "html": "<p>...</p>", "test": true }
```

- **Behavior**:
  - If `test: true`, sends a single test email to the admin's email and returns the provider response.
  - Otherwise, queries `profiles` for `marketing_opt_in = true` and sends the broadcast to those emails.
  - Uses `EMAIL_API_KEY` stored (encrypted) in `store_settings` and fetched server-side via `getEmailKey()`.
  - Uses Resend API (`https://api.resend.com/emails`) by default.

- **Responses**:
  - 200: `{ "sent": <number> }` on success.
  - 401: unauthenticated.
  - 403: user is not admin.
  - 400: invalid payload.
  - 500: misconfiguration (missing API key).

### Sitemap (app/sitemap.ts)

- **Purpose**: Dynamic XML sitemap generated server-side.
- **Behavior**: Queries `blog_posts` (where `status = 'published'`) and `products` (where `published = true` and `active = true`) and emits absolute URLs using `NEXT_PUBLIC_SITE_URL`.
- **Fields**: Each URL entry includes `<loc>` and `<lastmod>` derived from `updated_at`.

-- TODO: Ensure `NEXT_PUBLIC_SITE_URL` is set in environment for absolute URLs.

  ## Reviews API Contract

  ### Submit Review (Server Action)

  - **Server Action**: `lib/actions/reviews.ts` exposes `submitReview({ product_id, rating, body, media_urls })`
  - **Auth**: Server-side only — uses `getServerSupabase()` to validate the session.
  - **Behavior**: Verifies the user purchased the product (status in `paid` or `delivered` and `items` JSONB contains the `product_id`). If eligible, inserts into `reviews` with `verified_purchase = true`.
  - **Return**: `{ success: true, review_id }` or `{ success: false, error }`.

  ### Verify Eligibility API

  - **Endpoint**: `GET|POST /api/reviews/verify-eligibility?product_id=<uuid>`
  - **Response**: `{ eligible: boolean }`
  - **Auth**: 403 returned if not authenticated.
  - **Server**: Uses `getServerSupabase()` and checks `orders` where `user_id = current_user.id` AND `status IN ('paid','delivered')` AND `items @> '[{"product_id":"<uuid>"}]'::jsonb` (JSONB containment).

  ### get_product_reviews RPC

  - **RPC**: `public.get_product_reviews(product_uuid uuid, limit int DEFAULT 20, offset int DEFAULT 0)`
  - **Behavior**: Returns a safe subset of `reviews` fields ordered by weighted tiers:
    - Tier 1: `rating = 5` AND `array_length(media_urls,1) > 0`
    - Tier 2: `rating = 4` AND `array_length(media_urls,1) > 0`
    - Tier 3: `rating = 5` AND no media URLs
    - Tier 4: everything else
    Within each tier sort by `helpful_count DESC`, then `created_at DESC`.
  - **Security**: Implemented `SECURITY DEFINER` function — grant `EXECUTE` only to appropriate roles.
  - **Example response row**:

  ```json
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "product_id": "22222222-2222-2222-2222-222222222222",
    "user_id": "33333333-3333-3333-3333-333333333333",
    "rating": 5,
    "body": "Love the fabric and fit!",
    "media_urls": ["https://.../review-media/33333333/photo1.jpg"],
    "helpful_count": 12,
    "verified_purchase": true,
    "created_at": "2026-03-01T12:34:56.789Z"
  }
  ```

  ### Storage & Upload Guidelines

  - **Bucket**: `review-media` — path convention: `review-media/<user_id>/<filename>`.
  - **Client limits**: Recommend max 20MB per file, max ~100MB total per review (enforce client-side orchestration and show progress).
  - **Policies**: Use `storage.objects` RLS policies to restrict `INSERT` to authenticated users where `new.key LIKE auth.uid() || '/%'`. Reads can be public for this bucket or served via signed URLs for private buckets.

  ---

  - 409 `INVENTORY_EXHAUSTED` — returned when requested qty exceeds available stock.
  - 502 `RAZORPAY_ORDER_FAILED` — Razorpay order creation failed; reserved inventory is released.

### GET /api/razorpay-key

- **Purpose**: Public endpoint to retrieve the public `RAZORPAY_KEY_ID` (no secret). Useful for client-side checkout flows that only need the key id.
- **Response (200)**:

```json
{ "key_id": "rzp_test_xxx" }
```

- The endpoint reads `RAZORPAY_KEY_ID` from `store_settings`, decrypts it server-side, and returns the ID only. Do NOT store or return `RAZORPAY_KEY_SECRET` from any public endpoint.

Security notes:
- Server-side code uses `getServerSupabase()` and server credentials to call RPCs that modify inventory (`reserve_inventory`). All inventory-modifying RPCs are `SECURITY DEFINER` and should be owned by the DB service-role user.
- Reservation expiry/TTL is handled out-of-band in a future sprint — reservations created in `inventory_reservations` should be cleaned by a scheduled job that calls `release_reservation(order_id)` for expired entries.


/* 3) Server Action / TypeScript shapes (callable from Next.js Server Actions)
 *    - These actions should be implemented server-side and use the
 *      Supabase service role key. Examples below describe the TypeScript
 *      parameter/result shapes for the admin UI.
 */

export type SearchProductsParams = { query: string; limit?: number };
export type SearchProductsResult = Product[];

export type EncryptSettingParams = { key: string; value: string };
export type EncryptSettingResult = { id: number; key: string; value_encrypted: string };

/* Encryption utility
 * - `lib/encryption.ts` provides `encryptSettings(value)` and `decryptSettings(ciphertextB64)`.
 * - These are server-only (use service role) and require SETTINGS_ENCRYPTION_KEY env var.
 */

/* Deployment notes:
 * - Implement server actions (Next.js Server Actions or API routes) that call
 *   these RPCs and utilities using a Supabase client initialized with the
 *   service role key. RLS will not apply to service-role operations.
 */
*/
