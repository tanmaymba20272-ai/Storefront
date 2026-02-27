# Verify Catalog API

Manual verification steps for the server actions implemented in `lib/actions/catalog.ts`.

Prerequisites:
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment.
- Set `DEFAULT_PRODUCT_IMAGE` (optional).

Node example (run locally):

```js
// node -e "(async()=>{...})()"
const fetch = require('node-fetch')
const SUPABASE_URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function callRpc(path, body){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${KEY}` }
  })
  return res.json()
}

console.log('Use the server-side actions directly from Node by importing lib/actions/catalog.ts in a small script that sets env vars.');
```

Example curl snippets (use `SUPABASE_SERVICE_ROLE_KEY`):

- Get categories (expected array of {id,name,slug}):

```bash
curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/categories?select=id,name,slug"
```

- Get published products (expected array of products; images are signed URLs):

```bash
curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/products?select=id,name,slug,price_cents,currency,metadata,category(drops)&limit=5"
```

- Example expected `getPublishedProducts()` item shape (JSON):

```json
{
  "id": "uuid",
  "name": "Tee",
  "slug": "tee-1",
  "price_cents": 3500,
  "currency": "USD",
  "metadata": { "images": ["https://...signed..."], "color":"black" },
  "category": { "id":"..","name":"Tops","slug":"tops" },
  "drop": null
}
```

- Get drops (expected array of {id,name,start_at,end_at,status}):

```bash
curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/drops?select=id,name,start_at,end_at,status&order=start_at"
```

- Get single product by slug: server action `getProductBySlug('my-slug')` returns:

```json
{
  "id":"...",
  "name":"...",
  "slug":"...",
  "price_cents": 3500,
  "currency":"USD",
  "description":"...",
  "metadata": { "images": ["https://...signed..."], ... },
  "category": { ... },
  "drop": { ... },
  "inventory_count": 42,
  "variants": [{ "id":"..","sku":"..","price_cents":3500, "currency":"USD" }]
}
```

Notes:
- Use the server-side functions from `lib/actions/catalog.ts` in Node/Next.js with `SUPABASE_SERVICE_ROLE_KEY` set — those functions perform signing and will never expose admin-only fields like `cost_price`.
