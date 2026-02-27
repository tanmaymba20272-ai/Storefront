# 03 - Token Caching Notes

Shiprocket tokens are short-lived. The current implementation obtains a fresh token per-request.

Recommended upgrade path:

- Use a central cache (Redis) with a TTL slightly under the token lifetime.
- Cache key example: `shiprocket:token` storing `{ token: 'xxx', expires_at: 1670000000 }`.
- On token request:
  1. Try Redis GET. If present and not expired, return cached token.
  2. If missing or near-expiry, call the auth endpoint, store token with TTL, return token.

Pseudocode (node):

```ts
async function cachedShiprocketToken(redis) {
  const cached = await redis.get('shiprocket:token')
  if (cached) return JSON.parse(cached).token
  const { token } = await getShiprocketToken() // current utility
  await redis.set('shiprocket:token', JSON.stringify({ token }), 'EX', 3000) // set TTL
  return token
}
```

Notes:
- Consider in-memory caching for single-instance deployments, but prefer Redis for multi-instance.
- Ensure cache invalidation on auth-related failures.
