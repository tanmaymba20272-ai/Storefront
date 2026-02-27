# Chat Rate Limit Manual Test

Steps to reproduce the rate limit behavior for `/api/chat` (dev in-memory limiter):

1. Run a small script or use `curl` to POST 15 quick requests to `/api/chat` from the same IP.

Example using `curl` in a loop (replace body as needed):

```bash
for i in {1..15}; do
  curl -N -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"hello '"$i"'","mode":"general"}' \
    -w "\nSTATUS:%{http_code}\n"
done
```

2. Observe the HTTP status codes. The first 10 requests within 60 seconds should return `200` (or a streaming response). The 11th request should return `429`.

3. When the 11th request returns `429`, the response includes a `Retry-After` header (seconds until the limiter window allows new requests).

Notes:
- This test assumes the server is running locally and the in-memory rate limiter is active. In production, replace the in-memory limiter with a centralized store and adjust tests accordingly.
